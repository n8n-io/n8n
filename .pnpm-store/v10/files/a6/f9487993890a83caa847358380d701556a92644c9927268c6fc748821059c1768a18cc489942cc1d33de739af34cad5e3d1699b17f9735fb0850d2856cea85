"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.select = exports.filter = exports.some = exports.is = exports.aliases = exports.pseudos = exports.filters = void 0;
var css_what_1 = require("css-what");
var css_select_1 = require("css-select");
var DomUtils = __importStar(require("domutils"));
var helpers_1 = require("./helpers");
var positionals_1 = require("./positionals");
// Re-export pseudo extension points
var css_select_2 = require("css-select");
Object.defineProperty(exports, "filters", { enumerable: true, get: function () { return css_select_2.filters; } });
Object.defineProperty(exports, "pseudos", { enumerable: true, get: function () { return css_select_2.pseudos; } });
Object.defineProperty(exports, "aliases", { enumerable: true, get: function () { return css_select_2.aliases; } });
/** Used to indicate a scope should be filtered. Might be ignored when filtering. */
var SCOPE_PSEUDO = {
    type: css_what_1.SelectorType.Pseudo,
    name: "scope",
    data: null,
};
/** Used for actually filtering for scope. */
var CUSTOM_SCOPE_PSEUDO = __assign({}, SCOPE_PSEUDO);
var UNIVERSAL_SELECTOR = {
    type: css_what_1.SelectorType.Universal,
    namespace: null,
};
function is(element, selector, options) {
    if (options === void 0) { options = {}; }
    return some([element], selector, options);
}
exports.is = is;
function some(elements, selector, options) {
    if (options === void 0) { options = {}; }
    if (typeof selector === "function")
        return elements.some(selector);
    var _a = (0, helpers_1.groupSelectors)((0, css_what_1.parse)(selector)), plain = _a[0], filtered = _a[1];
    return ((plain.length > 0 && elements.some((0, css_select_1._compileToken)(plain, options))) ||
        filtered.some(function (sel) { return filterBySelector(sel, elements, options).length > 0; }));
}
exports.some = some;
function filterByPosition(filter, elems, data, options) {
    var num = typeof data === "string" ? parseInt(data, 10) : NaN;
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
            return elems.filter(function (_, i) { return i % 2 === 0; });
        case "odd":
            return elems.filter(function (_, i) { return i % 2 === 1; });
        case "not": {
            var filtered_1 = new Set(filterParsed(data, elems, options));
            return elems.filter(function (e) { return !filtered_1.has(e); });
        }
    }
}
function filter(selector, elements, options) {
    if (options === void 0) { options = {}; }
    return filterParsed((0, css_what_1.parse)(selector), elements, options);
}
exports.filter = filter;
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
    var _a = (0, helpers_1.groupSelectors)(selector), plainSelectors = _a[0], filteredSelectors = _a[1];
    var found;
    if (plainSelectors.length) {
        var filtered = filterElements(elements, plainSelectors, options);
        // If there are no filters, just return
        if (filteredSelectors.length === 0) {
            return filtered;
        }
        // Otherwise, we have to do some filtering
        if (filtered.length) {
            found = new Set(filtered);
        }
    }
    for (var i = 0; i < filteredSelectors.length && (found === null || found === void 0 ? void 0 : found.size) !== elements.length; i++) {
        var filteredSelector = filteredSelectors[i];
        var missing = found
            ? elements.filter(function (e) { return DomUtils.isTag(e) && !found.has(e); })
            : elements;
        if (missing.length === 0)
            break;
        var filtered = filterBySelector(filteredSelector, elements, options);
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
                filtered.forEach(function (el) { return found.add(el); });
            }
        }
    }
    return typeof found !== "undefined"
        ? (found.size === elements.length
            ? elements
            : // Filter elements to preserve order
                elements.filter(function (el) {
                    return found.has(el);
                }))
        : [];
}
function filterBySelector(selector, elements, options) {
    var _a;
    if (selector.some(css_what_1.isTraversal)) {
        /*
         * Get root node, run selector with the scope
         * set to all of our nodes.
         */
        var root = (_a = options.root) !== null && _a !== void 0 ? _a : (0, helpers_1.getDocumentRoot)(elements[0]);
        var sel = __spreadArray(__spreadArray([], selector, true), [CUSTOM_SCOPE_PSEUDO], false);
        return findFilterElements(root, sel, options, true, elements);
    }
    // Performance optimization: If we don't have to traverse, just filter set.
    return findFilterElements(elements, selector, options, false);
}
function select(selector, root, options) {
    if (options === void 0) { options = {}; }
    if (typeof selector === "function") {
        return find(root, selector);
    }
    var _a = (0, helpers_1.groupSelectors)((0, css_what_1.parse)(selector)), plain = _a[0], filtered = _a[1];
    var results = filtered.map(function (sel) {
        return findFilterElements(root, sel, options, true);
    });
    // Plain selectors can be queried in a single go
    if (plain.length) {
        results.push(findElements(root, plain, options, Infinity));
    }
    if (results.length === 0) {
        return [];
    }
    // If there was only a single selector, just return the result
    if (results.length === 1) {
        return results[0];
    }
    // Sort results, filtering for duplicates
    return DomUtils.uniqueSort(results.reduce(function (a, b) { return __spreadArray(__spreadArray([], a, true), b, true); }));
}
exports.select = select;
// Traversals that are treated differently in css-select.
var specialTraversal = new Set([
    css_what_1.SelectorType.Descendant,
    css_what_1.SelectorType.Adjacent,
]);
function includesScopePseudo(t) {
    return (t !== SCOPE_PSEUDO &&
        t.type === "pseudo" &&
        (t.name === "scope" ||
            (Array.isArray(t.data) &&
                t.data.some(function (data) { return data.some(includesScopePseudo); }))));
}
function addContextIfScope(selector, options, scopeContext) {
    return scopeContext && selector.some(includesScopePseudo)
        ? __assign(__assign({}, options), { context: scopeContext }) : options;
}
/**
 *
 * @param root Element(s) to search from.
 * @param selector Selector to look for.
 * @param options Options for querying.
 * @param queryForSelector Query multiple levels deep for the initial selector, even if it doesn't contain a traversal.
 * @param scopeContext Optional context for a :scope.
 */
function findFilterElements(root, selector, options, queryForSelector, scopeContext) {
    var filterIndex = selector.findIndex(positionals_1.isFilter);
    var sub = selector.slice(0, filterIndex);
    var filter = selector[filterIndex];
    /*
     * Set the number of elements to retrieve.
     * Eg. for :first, we only have to get a single element.
     */
    var limit = (0, positionals_1.getLimit)(filter.name, filter.data);
    if (limit === 0)
        return [];
    var subOpts = addContextIfScope(sub, options, scopeContext);
    /*
     * Skip `findElements` call if our selector starts with a positional
     * pseudo.
     */
    var elemsNoLimit = sub.length === 0 && !Array.isArray(root)
        ? DomUtils.getChildren(root).filter(DomUtils.isTag)
        : sub.length === 0 || (sub.length === 1 && sub[0] === SCOPE_PSEUDO)
            ? (Array.isArray(root) ? root : [root]).filter(DomUtils.isTag)
            : queryForSelector || sub.some(css_what_1.isTraversal)
                ? findElements(root, [sub], subOpts, limit)
                : filterElements(root, [sub], subOpts);
    var elems = elemsNoLimit.slice(0, limit);
    var result = filterByPosition(filter.name, elems, filter.data, options);
    if (result.length === 0 || selector.length === filterIndex + 1) {
        return result;
    }
    var remainingSelector = selector.slice(filterIndex + 1);
    var remainingHasTraversal = remainingSelector.some(css_what_1.isTraversal);
    var remainingOpts = addContextIfScope(remainingSelector, options, scopeContext);
    if (remainingHasTraversal) {
        /*
         * Some types of traversals have special logic when they start a selector
         * in css-select. If this is the case, add a universal selector in front of
         * the selector to avoid this behavior.
         */
        if (specialTraversal.has(remainingSelector[0].type)) {
            remainingSelector.unshift(UNIVERSAL_SELECTOR);
        }
        /*
         * Add a scope token in front of the remaining selector,
         * to make sure traversals don't match elements that aren't a
         * part of the considered tree.
         */
        remainingSelector.unshift(SCOPE_PSEUDO);
    }
    /*
     * If we have another filter, recursively call `findFilterElements`,
     * with the `recursive` flag disabled. We only have to look for more
     * elements when we see a traversal.
     *
     * Otherwise,
     */
    return remainingSelector.some(positionals_1.isFilter)
        ? findFilterElements(result, remainingSelector, options, false, scopeContext)
        : remainingHasTraversal
            ? // Query existing elements to resolve traversal.
                findElements(result, [remainingSelector], remainingOpts, Infinity)
            : // If we don't have any more traversals, simply filter elements.
                filterElements(result, [remainingSelector], remainingOpts);
}
function findElements(root, sel, options, limit) {
    if (limit === 0)
        return [];
    var query = (0, css_select_1._compileToken)(sel, options, root);
    return find(root, query, limit);
}
function find(root, query, limit) {
    if (limit === void 0) { limit = Infinity; }
    var elems = (0, css_select_1.prepareContext)(root, DomUtils, query.shouldTestNextSiblings);
    return DomUtils.find(function (node) { return DomUtils.isTag(node) && query(node); }, elems, true, limit);
}
function filterElements(elements, sel, options) {
    var els = (Array.isArray(elements) ? elements : [elements]).filter(DomUtils.isTag);
    if (els.length === 0)
        return els;
    var query = (0, css_select_1._compileToken)(sel, options);
    return els.filter(query);
}
