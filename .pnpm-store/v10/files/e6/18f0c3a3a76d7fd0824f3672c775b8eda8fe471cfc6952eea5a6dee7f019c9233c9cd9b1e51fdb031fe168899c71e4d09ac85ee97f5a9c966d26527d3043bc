"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterObject = void 0;
function filterObject(obj, keysToInclude) {
    const keysToIncludeSet = new Set(keysToInclude);
    return Object.entries(obj).reduce((acc, [key, value]) => {
        if (keysToIncludeSet.has(key)) {
            acc[key] = value;
        }
        return acc;
        // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
    }, {});
}
exports.filterObject = filterObject;
