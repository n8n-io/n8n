/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

/**
 * istanbul-lib-coverage exports an API that allows you to create and manipulate
 * file coverage, coverage maps (a set of file coverage objects) and summary
 * coverage objects. File coverage for the same file can be merged as can
 * entire coverage maps.
 *
 * @module Exports
 */
const { FileCoverage } = require('./lib/file-coverage');
const { CoverageMap } = require('./lib/coverage-map');
const { CoverageSummary } = require('./lib/coverage-summary');

module.exports = {
    /**
     * creates a coverage summary object
     * @param {Object} obj an argument with the same semantics
     *  as the one passed to the `CoverageSummary` constructor
     * @returns {CoverageSummary}
     */
    createCoverageSummary(obj) {
        if (obj && obj instanceof CoverageSummary) {
            return obj;
        }
        return new CoverageSummary(obj);
    },
    /**
     * creates a CoverageMap object
     * @param {Object} obj optional - an argument with the same semantics
     *  as the one passed to the CoverageMap constructor.
     * @returns {CoverageMap}
     */
    createCoverageMap(obj) {
        if (obj && obj instanceof CoverageMap) {
            return obj;
        }
        return new CoverageMap(obj);
    },
    /**
     * creates a FileCoverage object
     * @param {Object} obj optional - an argument with the same semantics
     *  as the one passed to the FileCoverage constructor.
     * @returns {FileCoverage}
     */
    createFileCoverage(obj) {
        if (obj && obj instanceof FileCoverage) {
            return obj;
        }
        return new FileCoverage(obj);
    }
};

/** classes exported for reuse */
module.exports.classes = {
    /**
     * the file coverage constructor
     */
    FileCoverage
};
