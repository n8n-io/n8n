'use strict';
/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
const fs = require('fs');
const FileWriter = require('./file-writer');
const XMLWriter = require('./xml-writer');
const tree = require('./tree');
const watermarks = require('./watermarks');
const SummarizerFactory = require('./summarizer-factory');

function defaultSourceLookup(path) {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch (ex) {
        throw new Error(`Unable to lookup source: ${path} (${ex.message})`);
    }
}

function normalizeWatermarks(specified = {}) {
    Object.entries(watermarks.getDefault()).forEach(([k, value]) => {
        const specValue = specified[k];
        if (!Array.isArray(specValue) || specValue.length !== 2) {
            specified[k] = value;
        }
    });

    return specified;
}

/**
 * A reporting context that is passed to report implementations
 * @param {Object} [opts=null] opts options
 * @param {String} [opts.dir='coverage'] opts.dir the reporting directory
 * @param {Object} [opts.watermarks=null] opts.watermarks watermarks for
 *  statements, lines, branches and functions
 * @param {Function} [opts.sourceFinder=fsLookup] opts.sourceFinder a
 *  function that returns source code given a file path. Defaults to
 *  filesystem lookups based on path.
 * @constructor
 */
class Context {
    constructor(opts) {
        this.dir = opts.dir || 'coverage';
        this.watermarks = normalizeWatermarks(opts.watermarks);
        this.sourceFinder = opts.sourceFinder || defaultSourceLookup;
        this._summarizerFactory = new SummarizerFactory(
            opts.coverageMap,
            opts.defaultSummarizer
        );
        this.data = {};
    }

    /**
     * returns a FileWriter implementation for reporting use. Also available
     * as the `writer` property on the context.
     * @returns {Writer}
     */
    getWriter() {
        return this.writer;
    }

    /**
     * returns the source code for the specified file path or throws if
     * the source could not be found.
     * @param {String} filePath the file path as found in a file coverage object
     * @returns {String} the source code
     */
    getSource(filePath) {
        return this.sourceFinder(filePath);
    }

    /**
     * returns the coverage class given a coverage
     * types and a percentage value.
     * @param {String} type - the coverage type, one of `statements`, `functions`,
     *  `branches`, or `lines`
     * @param {Number} value - the percentage value
     * @returns {String} one of `high`, `medium` or `low`
     */
    classForPercent(type, value) {
        const watermarks = this.watermarks[type];
        if (!watermarks) {
            return 'unknown';
        }
        if (value < watermarks[0]) {
            return 'low';
        }
        if (value >= watermarks[1]) {
            return 'high';
        }
        return 'medium';
    }

    /**
     * returns an XML writer for the supplied content writer
     * @param {ContentWriter} contentWriter the content writer to which the returned XML writer
     *  writes data
     * @returns {XMLWriter}
     */
    getXMLWriter(contentWriter) {
        return new XMLWriter(contentWriter);
    }

    /**
     * returns a full visitor given a partial one.
     * @param {Object} partialVisitor a partial visitor only having the functions of
     *  interest to the caller. These functions are called with a scope that is the
     *  supplied object.
     * @returns {Visitor}
     */
    getVisitor(partialVisitor) {
        return new tree.Visitor(partialVisitor);
    }

    getTree(name = 'defaultSummarizer') {
        return this._summarizerFactory[name];
    }
}

Object.defineProperty(Context.prototype, 'writer', {
    enumerable: true,
    get() {
        if (!this.data.writer) {
            this.data.writer = new FileWriter(this.dir);
        }
        return this.data.writer;
    }
});

module.exports = Context;
