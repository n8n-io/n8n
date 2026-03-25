'use strict';
/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
const fs = require('fs');
const path = require('path');
const { ReportBase } = require('istanbul-lib-report');
const HtmlReport = require('../html');

const standardLinkMapper = {
    getPath(node) {
        if (typeof node === 'string') {
            return node;
        }
        let filePath = node.getQualifiedName();
        if (node.isSummary()) {
            if (filePath !== '') {
                filePath += '/index.html';
            } else {
                filePath = 'index.html';
            }
        } else {
            filePath += '.html';
        }
        return filePath;
    },

    relativePath(source, target) {
        const targetPath = this.getPath(target);
        const sourcePath = path.dirname(this.getPath(source));
        return path.relative(sourcePath, targetPath);
    },

    assetPath(node, name) {
        return this.relativePath(this.getPath(node), name);
    }
};

class HtmlSpaReport extends ReportBase {
    constructor(opts = {}) {
        super({
            // force the summarizer to nested for html-spa
            summarizer: 'nested'
        });

        this.verbose = opts.verbose || false;
        this.linkMapper = opts.linkMapper || standardLinkMapper;
        this.subdir = opts.subdir || '';
        this.date = Date();
        this.skipEmpty = opts.skipEmpty;
        this.htmlReport = new HtmlReport(opts);
        this.htmlReport.getBreadcrumbHtml = function() {
            return '<a href="javascript:history.back()">Back</a>';
        };

        this.metricsToShow = opts.metricsToShow || [
            'lines',
            'branches',
            'functions'
        ];
    }

    getWriter(context) {
        if (!this.subdir) {
            return context.writer;
        }
        return context.writer.writerForDir(this.subdir);
    }

    onStart(root, context) {
        this.htmlReport.onStart(root, context);

        const writer = this.getWriter(context);
        const srcDir = path.resolve(__dirname, './assets');
        fs.readdirSync(srcDir).forEach(f => {
            const resolvedSource = path.resolve(srcDir, f);
            const resolvedDestination = '.';
            const stat = fs.statSync(resolvedSource);
            let dest;

            if (stat.isFile()) {
                dest = resolvedDestination + '/' + f;
                if (this.verbose) {
                    console.log('Write asset: ' + dest);
                }
                writer.copyFile(resolvedSource, dest);
            }
        });
    }

    onDetail(node, context) {
        this.htmlReport.onDetail(node, context);
    }

    getMetric(metric, type, context) {
        const isEmpty = metric.total === 0;
        return {
            total: metric.total,
            covered: metric.covered,
            skipped: metric.skipped,
            missed: metric.total - metric.covered,
            pct: isEmpty ? 0 : metric.pct,
            classForPercent: isEmpty
                ? 'empty'
                : context.classForPercent(type, metric.pct)
        };
    }

    toDataStructure(node, context) {
        const coverageSummary = node.getCoverageSummary();
        const metrics = {
            statements: this.getMetric(
                coverageSummary.statements,
                'statements',
                context
            ),
            branches: this.getMetric(
                coverageSummary.branches,
                'branches',
                context
            ),
            functions: this.getMetric(
                coverageSummary.functions,
                'functions',
                context
            ),
            lines: this.getMetric(coverageSummary.lines, 'lines', context)
        };

        return {
            file: node.getRelativeName(),
            isEmpty: coverageSummary.isEmpty(),
            metrics,
            children:
                node.isSummary() &&
                node
                    .getChildren()
                    .map(child => this.toDataStructure(child, context))
        };
    }

    onEnd(rootNode, context) {
        const data = this.toDataStructure(rootNode, context);

        const cw = this.getWriter(context).writeFile(
            this.linkMapper.getPath(rootNode)
        );

        cw.write(
            `<!doctype html>
            <html lang="en">
                <head>
                    <link rel="stylesheet" href="spa.css" />
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>
                <body>
                    <div id="app" class="app"></div>
                    <script>
                        window.data = ${JSON.stringify(data)};
                        window.generatedDatetime = ${JSON.stringify(
                            String(Date())
                        )};
                        window.metricsToShow = ${JSON.stringify(
                            this.metricsToShow
                        )};
                    </script>
                    <script src="bundle.js"></script>
                </body>
            </html>`
        );
        cw.close();
    }
}

module.exports = HtmlSpaReport;
