/**
 * AiRPubs OJS Enhancement Script v1
 * With fetch() - gets affiliations from article detail page
 * Works on servers that don't block same-origin fetch
 */
(function() {
    'use strict';

    function init() {
        // Inject styles
        var css = document.createElement('style');
        css.textContent = '' +
            '.obj_article_summary { padding:20px; margin-bottom:16px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; transition:all .2s ease; }' +
            '.obj_article_summary:hover { box-shadow:0 4px 15px rgba(0,0,0,.06); border-color:#1565c0; }' +
            '.obj_article_summary .title a { color:#1565c0; font-weight:700; font-size:15px; text-decoration:none; }' +
            '.obj_article_summary .title a:hover { text-decoration:underline; }' +
            '.airpubs-authors { font-size:14px; color:#374151; margin-bottom:6px; }' +
            '.airpubs-authors sup { font-size:10px; color:#1565c0; font-weight:700; }' +
            '.airpubs-affiliations { margin-bottom:14px; padding-left:24px; }' +
            '.airpubs-aff-line { font-size:12.5px; color:#9ca3af; line-height:1.6; }' +
            '.airpubs-extra { margin-top:12px; padding-top:12px; border-top:1px solid #f3f4f6; overflow:hidden; }' +
            '.airpubs-doi-row { display:flex!important; align-items:center!important; justify-content:space-between!important; flex-wrap:nowrap!important; gap:10px; }' +
            '.airpubs-galley-btns { display:flex!important; gap:8px; flex-wrap:wrap; flex-shrink:0; }' +
            '.airpubs-galley-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 16px; border:1.5px solid #dc3545; border-radius:5px; font-size:12.5px; font-weight:600; color:#dc3545; text-decoration:none; transition:all .2s ease; }' +
            '.airpubs-galley-btn:hover { background:#dc3545; color:#fff; text-decoration:none; }' +
            '.airpubs-pages { font-size:13px; color:#6b7280; display:inline-flex; align-items:center; gap:5px; }' +
            '.airpubs-doi a { color:#4b5563; font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; }' +
            '.airpubs-doi a:hover { color:#1565c0; }' +
            '.airpubs-doi-badge { display:inline-block; background:#f59e0b; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px; }' +
            '.airpubs-stats-row { display:flex; gap:20px; margin-bottom:10px; }' +
            '.airpubs-stat { font-size:13px; color:#6b7280; display:inline-flex; align-items:center; gap:5px; }' +
            '';
        document.head.appendChild(css);

        // Load external CSS
        var extCss = document.createElement('link');
        extCss.rel = 'stylesheet';
        extCss.href = 'https://cdn.jsdelivr.net/gh/triandi30/triandiumycss@main/umy.css';
        document.head.appendChild(extCss);

        var articles = document.querySelectorAll('.obj_article_summary');
        if (!articles.length) return;

        // Helper function to build bottom section
        function buildBottom(article, galleys, pages, doiText, abstractViews, pdfViews) {
            var bottomHtml = '<div class="airpubs-extra">';
            // Stats row
            bottomHtml += '<div class="airpubs-stats-row">';
            bottomHtml += '<span class="airpubs-stat"><i class="fas fa-chart-line"></i> Abstract : ' + abstractViews + '</span>';
            bottomHtml += '<span class="airpubs-stat"><i class="fas fa-download"></i> PDF : ' + pdfViews + '</span>';
            bottomHtml += '</div>';
            // Galley + DOI row
            bottomHtml += '<div class="airpubs-doi-row">';
            bottomHtml += '<div class="airpubs-galley-btns">';
            for (var g = 0; g < galleys.length; g++) {
                bottomHtml += '<a href="' + galleys[g].href + '" class="airpubs-galley-btn"><i class="fas fa-file-pdf"></i> ' + galleys[g].label + '</a>';
            }
            bottomHtml += '</div>';
            if (doiText) {
                bottomHtml += '<div class="airpubs-doi"><a href="https://doi.org/' + doiText + '" target="_blank"><span class="airpubs-doi-badge">DOI</span> ' + doiText + '</a></div>';
            }
            bottomHtml += '</div>';
            if (pages) {
                bottomHtml += '<div style="text-align:right;margin-top:4px"><span class="airpubs-pages"><i class="far fa-file-alt"></i> ' + pages + '</span></div>';
            }
            bottomHtml += '</div>';
            article.insertAdjacentHTML('beforeend', bottomHtml);
        }

        articles.forEach(function(article) {
            if (article.getAttribute('data-airpubs')) return;
            article.setAttribute('data-airpubs', '1');

            var titleLink = article.querySelector('.title a') || article.querySelector('h3 a') || article.querySelector('h4 a');
            if (!titleLink) return;

            var articleUrl = titleLink.getAttribute('href');
            var authorsDiv = article.querySelector('.meta .authors');
            var pagesDiv = article.querySelector('.meta .pages');
            var galleysList = article.querySelector('.galleys_links');

            // Read data first
            var pages = pagesDiv ? pagesDiv.textContent.trim() : '';
            var galleys = [];
            if (galleysList) {
                var gLinks = galleysList.querySelectorAll('a');
                for (var i = 0; i < gLinks.length; i++) {
                    galleys.push({ label: gLinks[i].textContent.trim(), href: gLinks[i].getAttribute('href') });
                }
            }

            // Remove originals
            if (pagesDiv && pagesDiv.parentNode) pagesDiv.parentNode.removeChild(pagesDiv);
            if (galleysList && galleysList.parentNode) galleysList.parentNode.removeChild(galleysList);

            // Fetch article detail for affiliations and DOI
            fetch(articleUrl).then(function(res) {
                return res.text();
            }).then(function(html) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(html, 'text/html');

                // Get authors from meta tags
                var metaAuthors = doc.querySelectorAll('meta[name="citation_author"]');
                var metaInst = doc.querySelectorAll('meta[name="citation_author_institution"]');
                var names = [], affs = [];

                if (metaAuthors.length > 0) {
                    for (var a = 0; a < metaAuthors.length; a++) {
                        names.push(metaAuthors[a].getAttribute('content'));
                        affs.push(metaInst[a] ? metaInst[a].getAttribute('content') : '');
                    }
                }

                // Build authors HTML
                if (names.length > 0 && authorsDiv) {
                    var authHtml = '<div class="airpubs-authors"><i class="fas fa-users"></i> ';
                    for (var j = 0; j < names.length; j++) {
                        authHtml += '<strong>' + names[j] + '</strong><sup>(' + (j+1) + ')</sup>';
                        if (j < names.length - 1) authHtml += ', ';
                    }
                    authHtml += '</div>';
                    var hasAff = affs.some(function(a) { return a.length > 0; });
                    if (hasAff) {
                        authHtml += '<div class="airpubs-affiliations">';
                        for (var k = 0; k < affs.length; k++) {
                            if (affs[k]) authHtml += '<div class="airpubs-aff-line">(' + (k+1) + ') ' + affs[k] + '</div>';
                        }
                        authHtml += '</div>';
                    }
                    authorsDiv.innerHTML = authHtml;
                }

                // Get DOI from meta
                var doiMeta = doc.querySelector('meta[name="DC.Identifier.DOI"]');
                var doiText = doiMeta ? doiMeta.getAttribute('content') : '';

                // Get article ID for stats API
                var artIdMatch = articleUrl.match(/\/view\/(\d+)/);
                var artId = artIdMatch ? artIdMatch[1] : '';
                var journalPath = window.location.pathname.match(/\/index\.php\/([^\/]+)/);
                var jPath = journalPath ? journalPath[1] : '';

                // Fetch stats from API
                var statsUrl = '/index.php/' + jPath + '/api/v1/stats/publications/' + artId;
                fetch(statsUrl).then(function(sr) { return sr.json(); }).then(function(stats) {
                    var abstractViews = stats.abstractViews || 0;
                    var pdfViews = stats.pdfViews || stats.galleyViews || 0;
                    buildBottom(article, galleys, pages, doiText, abstractViews, pdfViews);
                }).catch(function() {
                    buildBottom(article, galleys, pages, doiText, 0, 0);
                });

            }).catch(function() {
                // Fetch failed - fallback without affiliations/DOI
                if (authorsDiv) {
                    var authorsText = authorsDiv.textContent.trim();
                    var authorNames = authorsText.split(',');
                    var authHtml = '<div class="airpubs-authors"><i class="fas fa-users"></i> ';
                    for (var j = 0; j < authorNames.length; j++) {
                        var n = authorNames[j].trim();
                        if (n) {
                            authHtml += '<strong>' + n + '</strong><sup>(' + (j+1) + ')</sup>';
                            if (j < authorNames.length - 1) authHtml += ', ';
                        }
                    }
                    authHtml += '</div>';
                    authorsDiv.innerHTML = authHtml;
                }
                buildBottom(article, galleys, pages, '', 0, 0);
            });
        });

        // Article detail page
        var detailAuthors = document.querySelector('.obj_article_details .item.authors ul.authors');
        if (detailAuthors && !detailAuthors.getAttribute('data-airpubs')) {
            detailAuthors.setAttribute('data-airpubs', '1');
            var lis = detailAuthors.querySelectorAll('li');
            var authDetailHtml = '<div class="airpubs-authors" style="margin-bottom:8px"><i class="fas fa-users"></i> ';
            var affDetailHtml = '<div class="airpubs-affiliations">';
            var hasAff = false;
            for (var m = 0; m < lis.length; m++) {
                var nameEl = lis[m].querySelector('.name');
                var affEl = lis[m].querySelector('.affiliation');
                var nm = nameEl ? nameEl.textContent.trim() : '';
                var af = affEl ? affEl.textContent.trim() : '';
                if (nm) {
                    authDetailHtml += '<strong>' + nm + '</strong><sup>(' + (m+1) + ')</sup>';
                    if (m < lis.length - 1) authDetailHtml += ', ';
                }
                if (af) { hasAff = true; affDetailHtml += '<div class="airpubs-aff-line">(' + (m+1) + ') ' + af + '</div>'; }
            }
            authDetailHtml += '</div>';
            affDetailHtml += '</div>';
            detailAuthors.innerHTML = '<li>' + authDetailHtml + (hasAff ? affDetailHtml : '') + '</li>';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
