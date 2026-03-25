/*
 Copyright 2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

const debug = require('debug')('istanbuljs');
const libCoverage = require('istanbul-lib-coverage');
const { MappedCoverage } = require('./mapped');
const getMapping = require('./get-mapping');
const { getUniqueKey, getOutput } = require('./transform-utils');

class SourceMapTransformer {
    constructor(finder, opts = {}) {
        this.finder = finder;
        this.baseDir = opts.baseDir || process.cwd();
        this.resolveMapping = opts.getMapping || getMapping;
    }

    processFile(fc, sourceMap, coverageMapper) {
        let changes = 0;

        Object.entries(fc.statementMap).forEach(([s, loc]) => {
            const hits = fc.s[s];
            const mapping = this.resolveMapping(sourceMap, loc, fc.path);

            if (mapping) {
                changes += 1;
                const mappedCoverage = coverageMapper(mapping.source);
                mappedCoverage.addStatement(mapping.loc, hits);
            }
        });

        Object.entries(fc.fnMap).forEach(([f, fnMeta]) => {
            const hits = fc.f[f];
            const mapping = this.resolveMapping(
                sourceMap,
                fnMeta.decl,
                fc.path
            );

            const spanMapping = this.resolveMapping(
                sourceMap,
                fnMeta.loc,
                fc.path
            );

            if (
                mapping &&
                spanMapping &&
                mapping.source === spanMapping.source
            ) {
                changes += 1;
                const mappedCoverage = coverageMapper(mapping.source);
                mappedCoverage.addFunction(
                    fnMeta.name,
                    mapping.loc,
                    spanMapping.loc,
                    hits
                );
            }
        });

        Object.entries(fc.branchMap).forEach(([b, branchMeta]) => {
            const hits = fc.b[b];
            const locs = [];
            const mappedHits = [];
            let source;
            let skip;

            branchMeta.locations.forEach((loc, i) => {
                const mapping = this.resolveMapping(sourceMap, loc, fc.path);
                if (mapping) {
                    if (!source) {
                        source = mapping.source;
                    }

                    if (mapping.source !== source) {
                        skip = true;
                    }

                    locs.push(mapping.loc);
                    mappedHits.push(hits[i]);
                }
            });

            const locMapping = branchMeta.loc
                ? this.resolveMapping(sourceMap, branchMeta.loc, fc.path)
                : null;

            if (!skip && locs.length > 0) {
                changes += 1;
                const mappedCoverage = coverageMapper(source);
                mappedCoverage.addBranch(
                    branchMeta.type,
                    locMapping ? locMapping.loc : locs[0],
                    locs,
                    mappedHits
                );
            }
        });

        return changes > 0;
    }

    async transform(coverageMap) {
        const uniqueFiles = {};
        const getMappedCoverage = file => {
            const key = getUniqueKey(file);
            if (!uniqueFiles[key]) {
                uniqueFiles[key] = {
                    file,
                    mappedCoverage: new MappedCoverage(file)
                };
            }

            return uniqueFiles[key].mappedCoverage;
        };

        for (const file of coverageMap.files()) {
            const fc = coverageMap.fileCoverageFor(file);
            const sourceMap = await this.finder(file, fc);

            if (sourceMap) {
                const changed = this.processFile(
                    fc,
                    sourceMap,
                    getMappedCoverage
                );
                if (!changed) {
                    debug(`File [${file}] ignored, nothing could be mapped`);
                }
            } else {
                uniqueFiles[getUniqueKey(file)] = {
                    file,
                    mappedCoverage: new MappedCoverage(fc)
                };
            }
        }

        return libCoverage.createCoverageMap(getOutput(uniqueFiles));
    }
}

module.exports = {
    SourceMapTransformer
};
