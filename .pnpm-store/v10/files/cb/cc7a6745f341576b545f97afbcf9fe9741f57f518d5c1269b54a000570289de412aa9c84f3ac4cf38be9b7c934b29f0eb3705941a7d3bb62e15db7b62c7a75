/*
 Copyright 2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const debug = require('debug')('istanbuljs');
const { TraceMap, sourceContentFor } = require('@jridgewell/trace-mapping');
const pathutils = require('./pathutils');
const { SourceMapTransformer } = require('./transformer');

/**
 * Tracks source maps for registered files
 */
class MapStore {
    /**
     * @param {Object} opts [opts=undefined] options.
     * @param {Boolean} opts.verbose [opts.verbose=false] verbose mode
     * @param {String} opts.baseDir [opts.baseDir=null] alternate base directory
     *  to resolve sourcemap files
     * @param {Class} opts.SourceStore [opts.SourceStore=Map] class to use for
     * SourceStore.  Must support `get`, `set` and `clear` methods.
     * @param {Array} opts.sourceStoreOpts [opts.sourceStoreOpts=[]] arguments
     * to use in the SourceStore constructor.
     * @constructor
     */
    constructor(opts) {
        opts = {
            baseDir: null,
            verbose: false,
            SourceStore: Map,
            sourceStoreOpts: [],
            ...opts
        };
        this.baseDir = opts.baseDir;
        this.verbose = opts.verbose;
        this.sourceStore = new opts.SourceStore(...opts.sourceStoreOpts);
        this.data = Object.create(null);
        this.sourceFinder = this.sourceFinder.bind(this);
    }

    /**
     * Registers a source map URL with this store. It makes some input sanity checks
     * and silently fails on malformed input.
     * @param transformedFilePath - the file path for which the source map is valid.
     *  This must *exactly* match the path stashed for the coverage object to be
     *  useful.
     * @param sourceMapUrl - the source map URL, **not** a comment
     */
    registerURL(transformedFilePath, sourceMapUrl) {
        const d = 'data:';

        if (
            sourceMapUrl.length > d.length &&
            sourceMapUrl.substring(0, d.length) === d
        ) {
            const b64 = 'base64,';
            const pos = sourceMapUrl.indexOf(b64);
            if (pos > 0) {
                this.data[transformedFilePath] = {
                    type: 'encoded',
                    data: sourceMapUrl.substring(pos + b64.length)
                };
            } else {
                debug(`Unable to interpret source map URL: ${sourceMapUrl}`);
            }

            return;
        }

        const dir = path.dirname(path.resolve(transformedFilePath));
        const file = path.resolve(dir, sourceMapUrl);
        this.data[transformedFilePath] = { type: 'file', data: file };
    }

    /**
     * Registers a source map object with this store. Makes some basic sanity checks
     * and silently fails on malformed input.
     * @param transformedFilePath - the file path for which the source map is valid
     * @param sourceMap - the source map object
     */
    registerMap(transformedFilePath, sourceMap) {
        if (sourceMap && sourceMap.version) {
            this.data[transformedFilePath] = {
                type: 'object',
                data: sourceMap
            };
        } else {
            debug(
                'Invalid source map object: ' +
                    JSON.stringify(sourceMap, null, 2)
            );
        }
    }

    /**
     * Retrieve a source map object from this store.
     * @param filePath - the file path for which the source map is valid
     * @returns {Object} a parsed source map object
     */
    getSourceMapSync(filePath) {
        try {
            if (!this.data[filePath]) {
                return;
            }

            const d = this.data[filePath];
            if (d.type === 'file') {
                return JSON.parse(fs.readFileSync(d.data, 'utf8'));
            }

            if (d.type === 'encoded') {
                return JSON.parse(Buffer.from(d.data, 'base64').toString());
            }

            /* The caller might delete properties */
            return {
                ...d.data
            };
        } catch (error) {
            debug('Error returning source map for ' + filePath);
            debug(error.stack);

            return;
        }
    }

    /**
     * Add inputSourceMap property to coverage data
     * @param coverageData - the __coverage__ object
     * @returns {Object} a parsed source map object
     */
    addInputSourceMapsSync(coverageData) {
        Object.entries(coverageData).forEach(([filePath, data]) => {
            if (data.inputSourceMap) {
                return;
            }

            const sourceMap = this.getSourceMapSync(filePath);
            if (sourceMap) {
                data.inputSourceMap = sourceMap;
                /* This huge property is not needed. */
                delete data.inputSourceMap.sourcesContent;
            }
        });
    }

    sourceFinder(filePath) {
        const content = this.sourceStore.get(filePath);
        if (content !== undefined) {
            return content;
        }

        if (path.isAbsolute(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }

        return fs.readFileSync(
            pathutils.asAbsolute(filePath, this.baseDir),
            'utf8'
        );
    }

    /**
     * Transforms the coverage map provided into one that refers to original
     * sources when valid mappings have been registered with this store.
     * @param {CoverageMap} coverageMap - the coverage map to transform
     * @returns {Promise<CoverageMap>} the transformed coverage map
     */
    async transformCoverage(coverageMap) {
        const hasInputSourceMaps = coverageMap
            .files()
            .some(
                file => coverageMap.fileCoverageFor(file).data.inputSourceMap
            );

        if (!hasInputSourceMaps && Object.keys(this.data).length === 0) {
            return coverageMap;
        }

        const transformer = new SourceMapTransformer(
            async (filePath, coverage) => {
                try {
                    const obj =
                        coverage.data.inputSourceMap ||
                        this.getSourceMapSync(filePath);
                    if (!obj) {
                        return null;
                    }

                    const smc = new TraceMap(obj);
                    smc.sources.forEach(s => {
                        if (s) {
                            const content = sourceContentFor(smc, s);
                            if (content) {
                                const sourceFilePath = pathutils.relativeTo(
                                    s,
                                    filePath
                                );
                                this.sourceStore.set(sourceFilePath, content);
                            }
                        }
                    });

                    return smc;
                } catch (error) {
                    debug('Error returning source map for ' + filePath);
                    debug(error.stack);

                    return null;
                }
            }
        );

        return await transformer.transform(coverageMap);
    }

    /**
     * Disposes temporary resources allocated by this map store
     */
    dispose() {
        this.sourceStore.clear();
    }
}

module.exports = { MapStore };
