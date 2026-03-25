/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

const { FileCoverage } = require('./file-coverage');
const { CoverageSummary } = require('./coverage-summary');

function maybeConstruct(obj, klass) {
    if (obj instanceof klass) {
        return obj;
    }

    return new klass(obj);
}

function loadMap(source) {
    const data = Object.create(null);
    if (!source) {
        return data;
    }

    Object.entries(source).forEach(([k, cov]) => {
        data[k] = maybeConstruct(cov, FileCoverage);
    });

    return data;
}

/** CoverageMap is a map of `FileCoverage` objects keyed by file paths. */
class CoverageMap {
    /**
     * @constructor
     * @param {Object} [obj=undefined] obj A coverage map from which to initialize this
     * map's contents. This can be the raw global coverage object.
     */
    constructor(obj) {
        if (obj instanceof CoverageMap) {
            this.data = obj.data;
        } else {
            this.data = loadMap(obj);
        }
    }

    /**
     * merges a second coverage map into this one
     * @param {CoverageMap} obj - a CoverageMap or its raw data. Coverage is merged
     *  correctly for the same files and additional file coverage keys are created
     *  as needed.
     */
    merge(obj) {
        const other = maybeConstruct(obj, CoverageMap);
        Object.values(other.data).forEach(fc => {
            this.addFileCoverage(fc);
        });
    }

    /**
     * filter the coveragemap based on the callback provided
     * @param {Function (filename)} callback - Returns true if the path
     *  should be included in the coveragemap. False if it should be
     *  removed.
     */
    filter(callback) {
        Object.keys(this.data).forEach(k => {
            if (!callback(k)) {
                delete this.data[k];
            }
        });
    }

    /**
     * returns a JSON-serializable POJO for this coverage map
     * @returns {Object}
     */
    toJSON() {
        return this.data;
    }

    /**
     * returns an array for file paths for which this map has coverage
     * @returns {Array{string}} - array of files
     */
    files() {
        return Object.keys(this.data);
    }

    /**
     * returns the file coverage for the specified file.
     * @param {String} file
     * @returns {FileCoverage}
     */
    fileCoverageFor(file) {
        const fc = this.data[file];
        if (!fc) {
            throw new Error(`No file coverage available for: ${file}`);
        }
        return fc;
    }

    /**
     * adds a file coverage object to this map. If the path for the object,
     * already exists in the map, it is merged with the existing coverage
     * otherwise a new key is added to the map.
     * @param {FileCoverage} fc the file coverage to add
     */
    addFileCoverage(fc) {
        const cov = new FileCoverage(fc);
        const { path } = cov;
        if (this.data[path]) {
            this.data[path].merge(cov);
        } else {
            this.data[path] = cov;
        }
    }

    /**
     * returns the coverage summary for all the file coverage objects in this map.
     * @returns {CoverageSummary}
     */
    getCoverageSummary() {
        const ret = new CoverageSummary();
        Object.values(this.data).forEach(fc => {
            ret.merge(fc.toSummary());
        });

        return ret;
    }
}

module.exports = {
    CoverageMap
};
