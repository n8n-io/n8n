import { compareSegments, validateAndParse } from './utils.js';
/**
 * Compare [semver](https://semver.org/) version strings to find greater, equal or lesser.
 * This library supports the full semver specification, including comparing versions with different number of digits like `1.0.0`, `1.0`, `1`, and pre-release versions like `1.0.0-alpha`.
 * @param v1 - First version to compare
 * @param v2 - Second version to compare
 * @returns Numeric value compatible with the [Array.sort(fn) interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
 */
export const compareVersions = (v1, v2) => {
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
//# sourceMappingURL=compareVersions.js.map