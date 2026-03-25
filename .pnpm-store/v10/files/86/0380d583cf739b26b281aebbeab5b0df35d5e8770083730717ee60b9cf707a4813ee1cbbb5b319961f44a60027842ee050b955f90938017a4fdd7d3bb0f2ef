import { parse, SelectorType, isTraversal } from "css-what";
import { _compileToken as compileToken, prepareContext, } from "css-select";
import * as DomUtils from "domutils";
import * as boolbase from "boolbase";
import { getDocumentRoot, groupSelectors } from "./helpers.js";
import { isFilter, getLimit, } from "./positionals.js";
// Re-export pseudo extension points
export { filters, pseudos, aliases } from "css-select";
const UNIVERSAL_SELECTOR = {
    type: SelectorType.Universal,
    namespace: null,
};
const SCOPE_PSEUDO = {
    type: SelectorType.Pseudo,
    name: "scope",
    data: null,
};
export function is(element, selector, options = {}) {
    return some([element], selector, options);
}
export function some(elements, selector, options = {}) {
    if (typeof selector === "function")
        return elements.some(selector);
    const [plain, filtered] = groupSelectors(parse(selector));
    return ((plain.length > 0 && elements.some(compileToken(plain, options))) ||
        filtered.some((sel) => filterBySelector(sel, elements, options).length > 0));
}
function filterByPosition(filter, elems, data, options) {
    const num = typeof data === "string" ? parseInt(data, 10) : NaN;
    switch (filter) {
        case "first":
        case "lt":
            // Already done in `getLimit`
            return elems;
        case "last":
            return elems.length > 0 ? [elems[elems.length - 1]] : elems;
        case "nth":
        case "eq":
            return isFinite(num) && Math.abs(num) < elems.length
                ? [num < 0 ? elems[elems.length + num] : elems[num]]
                : [];
        case "gt":
            return isFinite(num) ? elems.slice(num + 1) : [];
        case "even":
            return elems.filter((_, i) => i % 2 === 0);
        case "odd":
            return elems.filter((_, i) => i % 2 === 1);
        case "not": {
            const filtered = new Set(filterParsed(data, elems, options));
            return elems.filter((e) => !filtered.has(e));
        }
    }
}
export function filter(selector, elements, options = {}) {
    return filterParsed(parse(selector), elements, options);
}
/**
 * Filter a set of elements by a selector.
 *
 * Will return elements in the original order.
 *
 * @param selector Selector to filter by.
 * @param elements Elements to filter.
 * @param options Options for selector.
 */
function filterParsed(selector, elements, options) {
    if (elements.length === 0)
        return [];
    const [plainSelectors, filteredSelectors] = groupSelectors(selector);
    let found;
    if (plainSelectors.length) {
        const filtered = filterElements(elements, plainSelectors, options);
        // If there are no filters, just return
        if (filteredSelectors.length === 0) {
            return filtered;
        }
        // Otherwise, we have to do some filtering
        if (filtered.length) {
            found = new Set(filtered);
        }
    }
    for (let i = 0; i < filteredSelectors.length && (found === null || found === void 0 ? void 0 : found.size) !== elements.length; i++) {
        const filteredSelector = filteredSelectors[i];
        const missing = found
            ? elements.filter((e) => DomUtils.isTag(e) && !found.has(e))
            : elements;
        if (missing.length === 0)
            break;
        const filtered = filterBySelector(filteredSelector, elements, options);
        if (filtered.length) {
            if (!found) {
                /*
                 * If we haven't found anything before the last selector,
                 * just return what we found now.
                 */
                if (i === filteredSelectors.length - 1) {
                    return filtered;
                }
                found = new Set(filtered);
            }
            else {
                filtered.forEach((el) => found.add(el));
            }
        }
    }
    return typeof found !== "undefined"
        ? (found.size === elements.length
            ? elements
            : // Filter elements to preserve order
                elements.filter((el) => found.has(el)))
        : [];
}
function filterBySelector(selector, elements, options) {
    var _a;
    if (selector.some(isTraversal)) {
        /*
         * Get root node, run selector with the scope
         * set to all of our nodes.
         */
        const root = (_a = options.root) !== null && _a !== void 0 ? _a : getDocumentRoot(elements[0]);
        const opts = { ...options, context: elements, relativeSelector: false };
        selector.push(SCOPE_PSEUDO);
        return findFilterElements(root, selector, opts, true, elements.length);
    }
    // Performance optimization: If we don't have to traverse, just filter set.
    return findFilterElements(elements, selector, options, false, elements.length);
}
export function select(selector, root, options = {}, limit = Infinity) {
    if (typeof selector === "function") {
        return find(root, selector);
    }
    const [plain, filtered] = groupSelectors(parse(selector));
    const results = filtered.map((sel) => findFilterElements(root, sel, options, true, limit));
    // Plain selectors can be queried in a single go
    if (plain.length) {
        results.push(findElements(root, plain, options, limit));
    }
    if (results.length === 0) {
        return [];
    }
    // If there was only a single selector, just return the result
    if (results.length === 1) {
        return results[0];
    }
    // Sort results, filtering for duplicates
    return DomUtils.uniqueSort(results.reduce((a, b) => [...a, ...b]));
}
/**
 *
 * @param root Element(s) to search from.
 * @param selector Selector to look for.
 * @param options Options for querying.
 * @param queryForSelector Query multiple levels deep for the initial selector, even if it doesn't contain a traversal.
 */
function findFilterElements(root, selector, options, queryForSelector, totalLimit) {
    const filterIndex = selector.findIndex(isFilter);
    const sub = selector.slice(0, filterIndex);
    const filter = selector[filterIndex];
    // If we are at the end of the selector, we can limit the number of elements to retrieve.
    const partLimit = selector.length - 1 === filterIndex ? totalLimit : Infinity;
    /*
     * Set the number of elements to retrieve.
     * Eg. for :first, we only have to get a single element.
     */
    const limit = getLimit(filter.name, filter.data, partLimit);
    if (limit === 0)
        return [];
    /*
     * Skip `findElements` call if our selector starts with a positional
     * pseudo.
     */
    const elemsNoLimit = sub.length === 0 && !Array.isArray(root)
        ? DomUtils.getChildren(root).filter(DomUtils.isTag)
        : sub.length === 0
            ? (Array.isArray(root) ? root : [root]).filter(DomUtils.isTag)
            : queryForSelector || sub.some(isTraversal)
                ? findElements(root, [sub], options, limit)
                : filterElements(root, [sub], options);
    const elems = elemsNoLimit.slice(0, limit);
    let result = filterByPosition(filter.name, elems, filter.data, options);
    if (result.length === 0 || selector.length === filterIndex + 1) {
        return result;
    }
    const remainingSelector = selector.slice(filterIndex + 1);
    const remainingHasTraversal = remainingSelector.some(isTraversal);
    if (remainingHasTraversal) {
        if (isTraversal(remainingSelector[0])) {
            const { type } = remainingSelector[0];
            if (type === SelectorType.Sibling ||
                type === SelectorType.Adjacent) {
                // If we have a sibling traversal, we need to also look at the siblings.
                result = prepareContext(result, DomUtils, true);
            }
            // Avoid a traversal-first selector error.
            remainingSelector.unshift(UNIVERSAL_SELECTOR);
        }
        options = {
            ...options,
            // Avoid absolutizing the selector
            relativeSelector: false,
            /*
             * Add a custom root func, to make sure traversals don't match elements
             * that aren't a part of the considered tree.
             */
            rootFunc: (el) => result.includes(el),
        };
    }
    else if (options.rootFunc && options.rootFunc !== boolbase.trueFunc) {
        options = { ...options, rootFunc: boolbase.trueFunc };
    }
    /*
     * If we have another filter, recursively call `findFilterElements`,
     * with the `recursive` flag disabled. We only have to look for more
     * elements when we see a traversal.
     *
     * Otherwise,
     */
    return remainingSelector.some(isFilter)
        ? findFilterElements(result, remainingSelector, options, false, totalLimit)
        : remainingHasTraversal
            ? // Query existing elements to resolve traversal.
                findElements(result, [remainingSelector], options, totalLimit)
            : // If we don't have any more traversals, simply filter elements.
                filterElements(result, [remainingSelector], options);
}
function findElements(root, sel, options, limit) {
    const query = compileToken(sel, options, root);
    return find(root, query, limit);
}
function find(root, query, limit = Infinity) {
    const elems = prepareContext(root, DomUtils, query.shouldTestNextSiblings);
    return DomUtils.find((node) => DomUtils.isTag(node) && query(node), elems, true, limit);
}
function filterElements(elements, sel, options) {
    const els = (Array.isArray(elements) ? elements : [elements]).filter(DomUtils.isTag);
    if (els.length === 0)
        return els;
    const query = compileToken(sel, options);
    return query === boolbase.trueFunc ? els : els.filter(query);
}
//# sourceMappingURL=index.js.map