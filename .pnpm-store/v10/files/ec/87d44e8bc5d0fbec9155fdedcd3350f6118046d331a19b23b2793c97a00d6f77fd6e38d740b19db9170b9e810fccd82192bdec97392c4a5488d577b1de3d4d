"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.freezeDeeply = freezeDeeply;
/**
 * Freezes a given value deeply.
 */
function freezeDeeply(x) {
    if (typeof x === 'object' && x != null) {
        if (Array.isArray(x)) {
            x.forEach(freezeDeeply);
        }
        else {
            for (const key in x) {
                if (key !== 'parent' && Object.hasOwn(x, key)) {
                    freezeDeeply(x[key]);
                }
            }
        }
        Object.freeze(x);
    }
}
