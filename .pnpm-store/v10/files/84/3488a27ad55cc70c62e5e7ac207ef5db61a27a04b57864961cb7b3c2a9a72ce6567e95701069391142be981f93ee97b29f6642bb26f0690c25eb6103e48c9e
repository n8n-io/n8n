'use strict';
/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
const { ReportBase } = require('istanbul-lib-report');
const LcovOnlyReport = require('../lcovonly');
const HtmlReport = require('../html');

class LcovReport extends ReportBase {
    constructor(opts) {
        super();
        this.lcov = new LcovOnlyReport({ file: 'lcov.info', ...opts });
        this.html = new HtmlReport({ subdir: 'lcov-report' });
    }
}

['Start', 'End', 'Summary', 'SummaryEnd', 'Detail'].forEach(what => {
    const meth = 'on' + what;
    LcovReport.prototype[meth] = function(...args) {
        const lcov = this.lcov;
        const html = this.html;

        if (lcov[meth]) {
            lcov[meth](...args);
        }
        if (html[meth]) {
            html[meth](...args);
        }
    };
});

module.exports = LcovReport;
