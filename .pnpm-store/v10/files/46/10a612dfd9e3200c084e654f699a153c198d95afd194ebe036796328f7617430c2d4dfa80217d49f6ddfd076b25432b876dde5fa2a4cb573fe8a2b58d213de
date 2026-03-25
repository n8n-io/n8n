/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

const percent = require('./percent');
const dataProperties = require('./data-properties');
const { CoverageSummary } = require('./coverage-summary');

// returns a data object that represents empty coverage
function emptyCoverage(filePath, reportLogic) {
    const cov = {
        path: filePath,
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {}
    };
    if (reportLogic) cov.bT = {};
    return cov;
}

// asserts that a data object "looks like" a coverage object
function assertValidObject(obj) {
    const valid =
        obj &&
        obj.path &&
        obj.statementMap &&
        obj.fnMap &&
        obj.branchMap &&
        obj.s &&
        obj.f &&
        obj.b;
    if (!valid) {
        throw new Error(
            'Invalid file coverage object, missing keys, found:' +
                Object.keys(obj).join(',')
        );
    }
}

const keyFromLoc = ({ start, end }) =>
    `${start.line}|${start.column}|${end.line}|${end.column}`;

const isObj = o => !!o && typeof o === 'object';
const isLineCol = o =>
    isObj(o) && typeof o.line === 'number' && typeof o.column === 'number';
const isLoc = o => isObj(o) && isLineCol(o.start) && isLineCol(o.end);
const getLoc = o => (isLoc(o) ? o : isLoc(o.loc) ? o.loc : null);

// When merging, we can have a case where two ranges cover
// the same block of code with `hits=1`, and each carve out a
// different range with `hits=0` to indicate it's uncovered.
// Find the nearest container so that we can properly indicate
// that both sections are hit.
// Returns null if no containing item is found.
const findNearestContainer = (item, map) => {
    const itemLoc = getLoc(item);
    if (!itemLoc) return null;
    // the B item is not an identified range in the A set, BUT
    // it may be contained by an identified A range. If so, then
    // any hit of that containing A range counts as a hit of this
    // B range as well. We have to find the *narrowest* containing
    // range to be accurate, since ranges can be hit and un-hit
    // in a nested fashion.
    let nearestContainingItem = null;
    let containerDistance = null;
    let containerKey = null;
    for (const [i, mapItem] of Object.entries(map)) {
        const mapLoc = getLoc(mapItem);
        if (!mapLoc) continue;
        // contained if all of line distances are > 0
        // or line distance is 0 and col dist is >= 0
        const distance = [
            itemLoc.start.line - mapLoc.start.line,
            itemLoc.start.column - mapLoc.start.column,
            mapLoc.end.line - itemLoc.end.line,
            mapLoc.end.column - itemLoc.end.column
        ];
        if (
            distance[0] < 0 ||
            distance[2] < 0 ||
            (distance[0] === 0 && distance[1] < 0) ||
            (distance[2] === 0 && distance[3] < 0)
        ) {
            continue;
        }
        if (nearestContainingItem === null) {
            containerDistance = distance;
            nearestContainingItem = mapItem;
            containerKey = i;
            continue;
        }
        // closer line more relevant than closer column
        const closerBefore =
            distance[0] < containerDistance[0] ||
            (distance[0] === 0 && distance[1] < containerDistance[1]);
        const closerAfter =
            distance[2] < containerDistance[2] ||
            (distance[2] === 0 && distance[3] < containerDistance[3]);
        if (closerBefore || closerAfter) {
            // closer
            containerDistance = distance;
            nearestContainingItem = mapItem;
            containerKey = i;
        }
    }
    return containerKey;
};

// either add two numbers, or all matching entries in a number[]
const addHits = (aHits, bHits) => {
    if (typeof aHits === 'number' && typeof bHits === 'number') {
        return aHits + bHits;
    } else if (Array.isArray(aHits) && Array.isArray(bHits)) {
        return aHits.map((a, i) => (a || 0) + (bHits[i] || 0));
    }
    return null;
};

const addNearestContainerHits = (item, itemHits, map, mapHits) => {
    const container = findNearestContainer(item, map);
    if (container) {
        return addHits(itemHits, mapHits[container]);
    } else {
        return itemHits;
    }
};

const mergeProp = (aHits, aMap, bHits, bMap, itemKey = keyFromLoc) => {
    const aItems = {};
    for (const [key, itemHits] of Object.entries(aHits)) {
        const item = aMap[key];
        aItems[itemKey(item)] = [itemHits, item];
    }
    const bItems = {};
    for (const [key, itemHits] of Object.entries(bHits)) {
        const item = bMap[key];
        bItems[itemKey(item)] = [itemHits, item];
    }
    const mergedItems = {};
    for (const [key, aValue] of Object.entries(aItems)) {
        let aItemHits = aValue[0];
        const aItem = aValue[1];
        const bValue = bItems[key];
        if (!bValue) {
            // not an identified range in b, but might be contained by one
            aItemHits = addNearestContainerHits(aItem, aItemHits, bMap, bHits);
        } else {
            // is an identified range in b, so add the hits together
            aItemHits = addHits(aItemHits, bValue[0]);
        }
        mergedItems[key] = [aItemHits, aItem];
    }
    // now find the items in b that are not in a. already added matches.
    for (const [key, bValue] of Object.entries(bItems)) {
        let bItemHits = bValue[0];
        const bItem = bValue[1];
        if (mergedItems[key]) continue;
        // not an identified range in b, but might be contained by one
        bItemHits = addNearestContainerHits(bItem, bItemHits, aMap, aHits);
        mergedItems[key] = [bItemHits, bItem];
    }

    const hits = {};
    const map = {};

    Object.values(mergedItems).forEach(([itemHits, item], i) => {
        hits[i] = itemHits;
        map[i] = item;
    });

    return [hits, map];
};

/**
 * provides a read-only view of coverage for a single file.
 * The deep structure of this object is documented elsewhere. It has the following
 * properties:
 *
 * * `path` - the file path for which coverage is being tracked
 * * `statementMap` - map of statement locations keyed by statement index
 * * `fnMap` - map of function metadata keyed by function index
 * * `branchMap` - map of branch metadata keyed by branch index
 * * `s` - hit counts for statements
 * * `f` - hit count for functions
 * * `b` - hit count for branches
 */
class FileCoverage {
    /**
     * @constructor
     * @param {Object|FileCoverage|String} pathOrObj is a string that initializes
     * and empty coverage object with the specified file path or a data object that
     * has all the required properties for a file coverage object.
     */
    constructor(pathOrObj, reportLogic = false) {
        if (!pathOrObj) {
            throw new Error(
                'Coverage must be initialized with a path or an object'
            );
        }
        if (typeof pathOrObj === 'string') {
            this.data = emptyCoverage(pathOrObj, reportLogic);
        } else if (pathOrObj instanceof FileCoverage) {
            this.data = pathOrObj.data;
        } else if (typeof pathOrObj === 'object') {
            this.data = pathOrObj;
        } else {
            throw new Error('Invalid argument to coverage constructor');
        }
        assertValidObject(this.data);
    }

    /**
     * returns computed line coverage from statement coverage.
     * This is a map of hits keyed by line number in the source.
     */
    getLineCoverage() {
        const statementMap = this.data.statementMap;
        const statements = this.data.s;
        const lineMap = Object.create(null);

        Object.entries(statements).forEach(([st, count]) => {
            /* istanbul ignore if: is this even possible? */
            if (!statementMap[st]) {
                return;
            }
            const { line } = statementMap[st].start;
            const prevVal = lineMap[line];
            if (prevVal === undefined || prevVal < count) {
                lineMap[line] = count;
            }
        });
        return lineMap;
    }

    /**
     * returns an array of uncovered line numbers.
     * @returns {Array} an array of line numbers for which no hits have been
     *  collected.
     */
    getUncoveredLines() {
        const lc = this.getLineCoverage();
        const ret = [];
        Object.entries(lc).forEach(([l, hits]) => {
            if (hits === 0) {
                ret.push(l);
            }
        });
        return ret;
    }

    /**
     * returns a map of branch coverage by source line number.
     * @returns {Object} an object keyed by line number. Each object
     * has a `covered`, `total` and `coverage` (percentage) property.
     */
    getBranchCoverageByLine() {
        const branchMap = this.branchMap;
        const branches = this.b;
        const ret = {};
        Object.entries(branchMap).forEach(([k, map]) => {
            const line = map.line || map.loc.start.line;
            const branchData = branches[k];
            ret[line] = ret[line] || [];
            ret[line].push(...branchData);
        });
        Object.entries(ret).forEach(([k, dataArray]) => {
            const covered = dataArray.filter(item => item > 0);
            const coverage = (covered.length / dataArray.length) * 100;
            ret[k] = {
                covered: covered.length,
                total: dataArray.length,
                coverage
            };
        });
        return ret;
    }

    /**
     * return a JSON-serializable POJO for this file coverage object
     */
    toJSON() {
        return this.data;
    }

    /**
     * merges a second coverage object into this one, updating hit counts
     * @param {FileCoverage} other - the coverage object to be merged into this one.
     *  Note that the other object should have the same structure as this one (same file).
     */
    merge(other) {
        if (other.all === true) {
            return;
        }

        if (this.all === true) {
            this.data = other.data;
            return;
        }

        let [hits, map] = mergeProp(
            this.s,
            this.statementMap,
            other.s,
            other.statementMap
        );
        this.data.s = hits;
        this.data.statementMap = map;

        const keyFromLocProp = x => keyFromLoc(x.loc);
        const keyFromLocationsProp = x => keyFromLoc(x.locations[0]);

        [hits, map] = mergeProp(
            this.f,
            this.fnMap,
            other.f,
            other.fnMap,
            keyFromLocProp
        );
        this.data.f = hits;
        this.data.fnMap = map;

        [hits, map] = mergeProp(
            this.b,
            this.branchMap,
            other.b,
            other.branchMap,
            keyFromLocationsProp
        );
        this.data.b = hits;
        this.data.branchMap = map;

        // Tracking additional information about branch truthiness
        // can be optionally enabled:
        if (this.bT && other.bT) {
            [hits, map] = mergeProp(
                this.bT,
                this.branchMap,
                other.bT,
                other.branchMap,
                keyFromLocationsProp
            );
            this.data.bT = hits;
        }
    }

    computeSimpleTotals(property) {
        let stats = this[property];

        if (typeof stats === 'function') {
            stats = stats.call(this);
        }

        const ret = {
            total: Object.keys(stats).length,
            covered: Object.values(stats).filter(v => !!v).length,
            skipped: 0
        };
        ret.pct = percent(ret.covered, ret.total);
        return ret;
    }

    computeBranchTotals(property) {
        const stats = this[property];
        const ret = { total: 0, covered: 0, skipped: 0 };

        Object.values(stats).forEach(branches => {
            ret.covered += branches.filter(hits => hits > 0).length;
            ret.total += branches.length;
        });
        ret.pct = percent(ret.covered, ret.total);
        return ret;
    }

    /**
     * resets hit counts for all statements, functions and branches
     * in this coverage object resulting in zero coverage.
     */
    resetHits() {
        const statements = this.s;
        const functions = this.f;
        const branches = this.b;
        const branchesTrue = this.bT;
        Object.keys(statements).forEach(s => {
            statements[s] = 0;
        });
        Object.keys(functions).forEach(f => {
            functions[f] = 0;
        });
        Object.keys(branches).forEach(b => {
            branches[b].fill(0);
        });
        // Tracking additional information about branch truthiness
        // can be optionally enabled:
        if (branchesTrue) {
            Object.keys(branchesTrue).forEach(bT => {
                branchesTrue[bT].fill(0);
            });
        }
    }

    /**
     * returns a CoverageSummary for this file coverage object
     * @returns {CoverageSummary}
     */
    toSummary() {
        const ret = {};
        ret.lines = this.computeSimpleTotals('getLineCoverage');
        ret.functions = this.computeSimpleTotals('f', 'fnMap');
        ret.statements = this.computeSimpleTotals('s', 'statementMap');
        ret.branches = this.computeBranchTotals('b');
        // Tracking additional information about branch truthiness
        // can be optionally enabled:
        if (this.bT) {
            ret.branchesTrue = this.computeBranchTotals('bT');
        }
        return new CoverageSummary(ret);
    }
}

// expose coverage data attributes
dataProperties(FileCoverage, [
    'path',
    'statementMap',
    'fnMap',
    'branchMap',
    's',
    'f',
    'b',
    'bT',
    'all'
]);

module.exports = {
    FileCoverage,
    // exported for testing
    findNearestContainer,
    addHits,
    addNearestContainerHits
};
