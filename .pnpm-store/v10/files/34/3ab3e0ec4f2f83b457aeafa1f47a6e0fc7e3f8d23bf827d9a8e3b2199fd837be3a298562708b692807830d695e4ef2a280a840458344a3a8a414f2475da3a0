"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneDeeplyExcludesParent = cloneDeeplyExcludesParent;
/**
 * Clones a given value deeply.
 * Note: This ignores `parent` property.
 */
function cloneDeeplyExcludesParent(x) {
    if (typeof x === 'object' && x != null) {
        if (Array.isArray(x)) {
            return x.map(cloneDeeplyExcludesParent);
        }
        const retv = {};
        for (const key in x) {
            if (key !== 'parent' && Object.hasOwn(x, key)) {
                retv[key] = cloneDeeplyExcludesParent(x[key]);
            }
        }
        return retv;
    }
    return x;
}
