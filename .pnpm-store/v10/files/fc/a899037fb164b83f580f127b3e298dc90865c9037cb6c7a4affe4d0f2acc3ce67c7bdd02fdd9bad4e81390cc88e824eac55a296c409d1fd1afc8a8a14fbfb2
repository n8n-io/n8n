/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

/**
 * @module Exports
 */

const Context = require('./lib/context');
const watermarks = require('./lib/watermarks');
const ReportBase = require('./lib/report-base');

module.exports = {
    /**
     * returns a reporting context for the supplied options
     * @param {Object} [opts=null] opts
     * @returns {Context}
     */
    createContext(opts) {
        return new Context(opts);
    },

    /**
     * returns the default watermarks that would be used when not
     * overridden
     * @returns {Object} an object with `statements`, `functions`, `branches`,
     *  and `line` keys. Each value is a 2 element array that has the low and
     *  high watermark as percentages.
     */
    getDefaultWatermarks() {
        return watermarks.getDefault();
    },

    /**
     * Base class for all reports
     */
    ReportBase
};
