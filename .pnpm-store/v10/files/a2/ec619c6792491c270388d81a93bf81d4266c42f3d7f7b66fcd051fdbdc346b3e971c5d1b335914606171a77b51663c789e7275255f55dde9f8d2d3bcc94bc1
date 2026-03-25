(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.compareVersions = {}));
})(this, (function (exports) { 'use strict';

    const semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
    const validateAndParse = (version) => {
        if (typeof version !== 'string') {
            throw new TypeError('Invalid argument expected string');
        }
        const match = version.match(semver);
        if (!match) {
            throw new Error(`Invalid argument not valid semver ('${version}' received)`);
        }
        match.shift();
        return match;
    };
    const isWildcard = (s) => s === '*' || s === 'x' || s === 'X';
    const tryParse = (v) => {
        const n = parseInt(v, 10);
        return isNaN(n) ? v : n;
    };
    const forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
    const compareStrings = (a, b) => {
        if (isWildcard(a) || isWildcard(b))
            return 0;
        const [ap, bp] = forceType(tryParse(a), tryParse(b));
        if (ap > bp)
            return 1;
        if (ap < bp)
            return -1;
        return 0;
    };
    const compareSegments = (a, b) => {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const r = compareStrings(a[i] || '0', b[i] || '0');
            if (r !== 0)
                return r;
        }
        return 0;
    };

    /**
     * Compare [semver](https://semver.org/) version strings to find greater, equal or lesser.
     * This library supports the full semver specification, including comparing versions with different number of digits like `1.0.0`, `1.0`, `1`, and pre-release versions like `1.0.0-alpha`.
     * @param v1 - First version to compare
     * @param v2 - Second version to compare
     * @returns Numeric value compatible with the [Array.sort(fn) interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
     */
    const compareVersions = (v1, v2) => {
        // validate input and split into segments
        const n1 = validateAndParse(v1);
        const n2 = validateAndParse(v2);
        // pop off the patch
        const p1 = n1.pop();
        const p2 = n2.pop();
        // validate numbers
        const r = compareSegments(n1, n2);
        if (r !== 0)
            return r;
        // validate pre-release
        if (p1 && p2) {
            return compareSegments(p1.split('.'), p2.split('.'));
        }
        else if (p1 || p2) {
            return p1 ? -1 : 1;
        }
        return 0;
    };

    /**
     * Compare [semver](https://semver.org/) version strings using the specified operator.
     *
     * @param v1 First version to compare
     * @param v2 Second version to compare
     * @param operator Allowed arithmetic operator to use
     * @returns `true` if the comparison between the firstVersion and the secondVersion satisfies the operator, `false` otherwise.
     *
     * @example
     * ```
     * compare('10.1.8', '10.0.4', '>'); // return true
     * compare('10.0.1', '10.0.1', '='); // return true
     * compare('10.1.1', '10.2.2', '<'); // return true
     * compare('10.1.1', '10.2.2', '<='); // return true
     * compare('10.1.1', '10.2.2', '>='); // return false
     * ```
     */
    const compare = (v1, v2, operator) => {
        // validate input operator
        assertValidOperator(operator);
        // since result of compareVersions can only be -1 or 0 or 1
        // a simple map can be used to replace switch
        const res = compareVersions(v1, v2);
        return operatorResMap[operator].includes(res);
    };
    const operatorResMap = {
        '>': [1],
        '>=': [0, 1],
        '=': [0],
        '<=': [-1, 0],
        '<': [-1],
        '!=': [-1, 1],
    };
    const allowedOperators = Object.keys(operatorResMap);
    const assertValidOperator = (op) => {
        if (typeof op !== 'string') {
            throw new TypeError(`Invalid operator type, expected string but got ${typeof op}`);
        }
        if (allowedOperators.indexOf(op) === -1) {
            throw new Error(`Invalid operator, expected one of ${allowedOperators.join('|')}`);
        }
    };

    /**
     * Match [npm semver](https://docs.npmjs.com/cli/v6/using-npm/semver) version range.
     *
     * @param version Version number to match
     * @param range Range pattern for version
     * @returns `true` if the version number is within the range, `false` otherwise.
     *
     * @example
     * ```
     * satisfies('1.1.0', '^1.0.0'); // return true
     * satisfies('1.1.0', '~1.0.0'); // return false
     * ```
     */
    const satisfies = (version, range) => {
        // clean input
        range = range.replace(/([><=]+)\s+/g, '$1');
        // handle multiple comparators
        if (range.includes('||')) {
            return range.split('||').some((r) => satisfies(version, r));
        }
        else if (range.includes(' - ')) {
            const [a, b] = range.split(' - ', 2);
            return satisfies(version, `>=${a} <=${b}`);
        }
        else if (range.includes(' ')) {
            return range
                .trim()
                .replace(/\s{2,}/g, ' ')
                .split(' ')
                .every((r) => satisfies(version, r));
        }
        // if no range operator then "="
        const m = range.match(/^([<>=~^]+)/);
        const op = m ? m[1] : '=';
        // if gt/lt/eq then operator compare
        if (op !== '^' && op !== '~')
            return compare(version, range, op);
        // else range of either "~" or "^" is assumed
        const [v1, v2, v3, , vp] = validateAndParse(version);
        const [r1, r2, r3, , rp] = validateAndParse(range);
        const v = [v1, v2, v3];
        const r = [r1, r2 !== null && r2 !== void 0 ? r2 : 'x', r3 !== null && r3 !== void 0 ? r3 : 'x'];
        // validate pre-release
        if (rp) {
            if (!vp)
                return false;
            if (compareSegments(v, r) !== 0)
                return false;
            if (compareSegments(vp.split('.'), rp.split('.')) === -1)
                return false;
        }
        // first non-zero number
        const nonZero = r.findIndex((v) => v !== '0') + 1;
        // pointer to where segments can be >=
        const i = op === '~' ? 2 : nonZero > 1 ? nonZero : 1;
        // before pointer must be equal
        if (compareSegments(v.slice(0, i), r.slice(0, i)) !== 0)
            return false;
        // after pointer must be >=
        if (compareSegments(v.slice(i), r.slice(i)) === -1)
            return false;
        return true;
    };

    /**
     * Validate [semver](https://semver.org/) version strings.
     *
     * @param version Version number to validate
     * @returns `true` if the version number is a valid semver version number, `false` otherwise.
     *
     * @example
     * ```
     * validate('1.0.0-rc.1'); // return true
     * validate('1.0-rc.1'); // return false
     * validate('foo'); // return false
     * ```
     */
    const validate = (version) => typeof version === 'string' && /^[v\d]/.test(version) && semver.test(version);
    /**
     * Validate [semver](https://semver.org/) version strings strictly. Will not accept wildcards and version ranges.
     *
     * @param version Version number to validate
     * @returns `true` if the version number is a valid semver version number `false` otherwise
     *
     * @example
     * ```
     * validate('1.0.0-rc.1'); // return true
     * validate('1.0-rc.1'); // return false
     * validate('foo'); // return false
     * ```
     */
    const validateStrict = (version) => typeof version === 'string' &&
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(version);

    exports.compare = compare;
    exports.compareVersions = compareVersions;
    exports.satisfies = satisfies;
    exports.validate = validate;
    exports.validateStrict = validateStrict;

}));
//# sourceMappingURL=index.js.map
