"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheParentResults = cacheParentResults;
var querying_js_1 = require("./querying.js");
/**
 * Some selectors such as `:contains` and (non-relative) `:has` will only be
 * able to match elements if their parents match the selector (as they contain
 * a subset of the elements that the parent contains).
 *
 * This function wraps the given `matches` function in a function that caches
 * the results of the parent elements, so that the `matches` function only
 * needs to be called once for each subtree.
 */
function cacheParentResults(next, _a, matches) {
    var adapter = _a.adapter, cacheResults = _a.cacheResults;
    if (cacheResults === false || typeof WeakMap === "undefined") {
        return function (elem) { return next(elem) && matches(elem); };
    }
    // Use a cache to avoid re-checking children of an element.
    // @ts-expect-error `Node` is not extending object
    var resultCache = new WeakMap();
    function addResultToCache(elem) {
        var result = matches(elem);
        resultCache.set(elem, result);
        return result;
    }
    return function cachedMatcher(elem) {
        if (!next(elem))
            return false;
        if (resultCache.has(elem)) {
            return resultCache.get(elem);
        }
        // Check all of the element's parents.
        var node = elem;
        do {
            var parent = (0, querying_js_1.getElementParent)(node, adapter);
            if (parent === null) {
                return addResultToCache(elem);
            }
            node = parent;
        } while (!resultCache.has(node));
        return resultCache.get(node) && addResultToCache(elem);
    };
}
//# sourceMappingURL=cache.js.map