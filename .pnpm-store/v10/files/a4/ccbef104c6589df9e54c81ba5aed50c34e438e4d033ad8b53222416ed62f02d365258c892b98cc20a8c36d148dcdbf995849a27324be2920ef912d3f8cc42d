"use strict";
/**
 * Methods for traversing the DOM structure.
 *
 * @module cheerio/traversing
 */
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
exports.addBack = exports.add = exports.end = exports.slice = exports.index = exports.toArray = exports.get = exports.eq = exports.last = exports.first = exports.has = exports.not = exports.is = exports.filterArray = exports.filter = exports.map = exports.each = exports.contents = exports.children = exports.siblings = exports.prevUntil = exports.prevAll = exports.prev = exports.nextUntil = exports.nextAll = exports.next = exports.closest = exports.parentsUntil = exports.parents = exports.parent = exports.find = void 0;
var domhandler_1 = require("domhandler");
var select = __importStar(require("cheerio-select"));
var utils_js_1 = require("../utils.js");
var static_js_1 = require("../static.js");
var domutils_1 = require("domutils");
var reSiblingSelector = /^\s*[~+]/;
/**
 * Get the descendants of each element in the current set of matched elements,
 * filtered by a selector, jQuery object, or element.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').find('li').length;
 * //=> 3
 * $('#fruits').find($('.apple')).length;
 * //=> 1
 * ```
 *
 * @param selectorOrHaystack - Element to look for.
 * @returns The found elements.
 * @see {@link https://api.jquery.com/find/}
 */
function find(selectorOrHaystack) {
    var _a;
    if (!selectorOrHaystack) {
        return this._make([]);
    }
    var context = this.toArray();
    if (typeof selectorOrHaystack !== 'string') {
        var haystack = (0, utils_js_1.isCheerio)(selectorOrHaystack)
            ? selectorOrHaystack.toArray()
            : [selectorOrHaystack];
        return this._make(haystack.filter(function (elem) { return context.some(function (node) { return (0, static_js_1.contains)(node, elem); }); }));
    }
    var elems = reSiblingSelector.test(selectorOrHaystack)
        ? context
        : this.children().toArray();
    var options = {
        context: context,
        root: (_a = this._root) === null || _a === void 0 ? void 0 : _a[0],
        // Pass options that are recognized by `cheerio-select`
        xmlMode: this.options.xmlMode,
        lowerCaseTags: this.options.lowerCaseTags,
        lowerCaseAttributeNames: this.options.lowerCaseAttributeNames,
        pseudos: this.options.pseudos,
        quirksMode: this.options.quirksMode,
    };
    return this._make(select.select(selectorOrHaystack, elems, options));
}
exports.find = find;
/**
 * Creates a matcher, using a particular mapping function. Matchers provide a
 * function that finds elements using a generating function, supporting filtering.
 *
 * @private
 * @param matchMap - Mapping function.
 * @returns - Function for wrapping generating functions.
 */
function _getMatcher(matchMap) {
    return function (fn) {
        var postFns = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            postFns[_i - 1] = arguments[_i];
        }
        return function (selector) {
            var _a;
            var matched = matchMap(fn, this);
            if (selector) {
                matched = filterArray(matched, selector, this.options.xmlMode, (_a = this._root) === null || _a === void 0 ? void 0 : _a[0]);
            }
            return this._make(
            // Post processing is only necessary if there is more than one element.
            this.length > 1 && matched.length > 1
                ? postFns.reduce(function (elems, fn) { return fn(elems); }, matched)
                : matched);
        };
    };
}
/** Matcher that adds multiple elements for each entry in the input. */
var _matcher = _getMatcher(function (fn, elems) {
    var _a;
    var ret = [];
    for (var i = 0; i < elems.length; i++) {
        var value = fn(elems[i]);
        ret.push(value);
    }
    return (_a = new Array()).concat.apply(_a, ret);
});
/** Matcher that adds at most one element for each entry in the input. */
var _singleMatcher = _getMatcher(function (fn, elems) {
    var ret = [];
    for (var i = 0; i < elems.length; i++) {
        var value = fn(elems[i]);
        if (value !== null) {
            ret.push(value);
        }
    }
    return ret;
});
/**
 * Matcher that supports traversing until a condition is met.
 *
 * @returns A function usable for `*Until` methods.
 */
function _matchUntil(nextElem) {
    var postFns = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        postFns[_i - 1] = arguments[_i];
    }
    // We use a variable here that is used from within the matcher.
    var matches = null;
    var innerMatcher = _getMatcher(function (nextElem, elems) {
        var matched = [];
        (0, utils_js_1.domEach)(elems, function (elem) {
            for (var next_1; (next_1 = nextElem(elem)); elem = next_1) {
                // FIXME: `matched` might contain duplicates here and the index is too large.
                if (matches === null || matches === void 0 ? void 0 : matches(next_1, matched.length))
                    break;
                matched.push(next_1);
            }
        });
        return matched;
    }).apply(void 0, __spreadArray([nextElem], postFns, false));
    return function (selector, filterSelector) {
        var _this = this;
        // Override `matches` variable with the new target.
        matches =
            typeof selector === 'string'
                ? function (elem) { return select.is(elem, selector, _this.options); }
                : selector
                    ? getFilterFn(selector)
                    : null;
        var ret = innerMatcher.call(this, filterSelector);
        // Set `matches` to `null`, so we don't waste memory.
        matches = null;
        return ret;
    };
}
function _removeDuplicates(elems) {
    return Array.from(new Set(elems));
}
/**
 * Get the parent of each element in the current set of matched elements,
 * optionally filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').parent().attr('id');
 * //=> fruits
 * ```
 *
 * @param selector - If specified filter for parent.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parent/}
 */
exports.parent = _singleMatcher(function (_a) {
    var parent = _a.parent;
    return (parent && !(0, domhandler_1.isDocument)(parent) ? parent : null);
}, _removeDuplicates);
/**
 * Get a set of parents filtered by `selector` of each element in the current
 * set of match elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').parents().length;
 * //=> 2
 * $('.orange').parents('#fruits').length;
 * //=> 1
 * ```
 *
 * @param selector - If specified filter for parents.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parents/}
 */
exports.parents = _matcher(function (elem) {
    var matched = [];
    while (elem.parent && !(0, domhandler_1.isDocument)(elem.parent)) {
        matched.push(elem.parent);
        elem = elem.parent;
    }
    return matched;
}, domutils_1.uniqueSort, function (elems) { return elems.reverse(); });
/**
 * Get the ancestors of each element in the current set of matched elements, up
 * to but not including the element matched by the selector, DOM node, or cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').parentsUntil('#food').length;
 * //=> 1
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - Optional filter for parents.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parentsUntil/}
 */
exports.parentsUntil = _matchUntil(function (_a) {
    var parent = _a.parent;
    return (parent && !(0, domhandler_1.isDocument)(parent) ? parent : null);
}, domutils_1.uniqueSort, function (elems) { return elems.reverse(); });
/**
 * For each element in the set, get the first element that matches the selector
 * by testing the element itself and traversing up through its ancestors in the DOM tree.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').closest();
 * //=> []
 *
 * $('.orange').closest('.apple');
 * // => []
 *
 * $('.orange').closest('li');
 * //=> [<li class="orange">Orange</li>]
 *
 * $('.orange').closest('#fruits');
 * //=> [<ul id="fruits"> ... </ul>]
 * ```
 *
 * @param selector - Selector for the element to find.
 * @returns The closest nodes.
 * @see {@link https://api.jquery.com/closest/}
 */
function closest(selector) {
    var _a;
    var set = [];
    if (!selector) {
        return this._make(set);
    }
    var selectOpts = {
        xmlMode: this.options.xmlMode,
        root: (_a = this._root) === null || _a === void 0 ? void 0 : _a[0],
    };
    var selectFn = typeof selector === 'string'
        ? function (elem) { return select.is(elem, selector, selectOpts); }
        : getFilterFn(selector);
    (0, utils_js_1.domEach)(this, function (elem) {
        while (elem && (0, utils_js_1.isTag)(elem)) {
            if (selectFn(elem, 0)) {
                // Do not add duplicate elements to the set
                if (!set.includes(elem)) {
                    set.push(elem);
                }
                break;
            }
            elem = elem.parent;
        }
    });
    return this._make(set);
}
exports.closest = closest;
/**
 * Gets the next sibling of the first selected element, optionally filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').next().hasClass('orange');
 * //=> true
 * ```
 *
 * @param selector - If specified filter for sibling.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/next/}
 */
exports.next = _singleMatcher(function (elem) { return (0, domutils_1.nextElementSibling)(elem); });
/**
 * Gets all the following siblings of the first selected element, optionally
 * filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').nextAll();
 * //=> [<li class="orange">Orange</li>, <li class="pear">Pear</li>]
 * $('.apple').nextAll('.orange');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/nextAll/}
 */
exports.nextAll = _matcher(function (elem) {
    var matched = [];
    while (elem.next) {
        elem = elem.next;
        if ((0, utils_js_1.isTag)(elem))
            matched.push(elem);
    }
    return matched;
}, _removeDuplicates);
/**
 * Gets all the following siblings up to but not including the element matched
 * by the selector, optionally filtered by another selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').nextUntil('.pear');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - If specified filter for siblings.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/nextUntil/}
 */
exports.nextUntil = _matchUntil(function (el) { return (0, domutils_1.nextElementSibling)(el); }, _removeDuplicates);
/**
 * Gets the previous sibling of the first selected element optionally filtered
 * by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').prev().hasClass('apple');
 * //=> true
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prev/}
 */
exports.prev = _singleMatcher(function (elem) { return (0, domutils_1.prevElementSibling)(elem); });
/**
 * Gets all the preceding siblings of the first selected element, optionally
 * filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').prevAll();
 * //=> [<li class="orange">Orange</li>, <li class="apple">Apple</li>]
 *
 * $('.pear').prevAll('.orange');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prevAll/}
 */
exports.prevAll = _matcher(function (elem) {
    var matched = [];
    while (elem.prev) {
        elem = elem.prev;
        if ((0, utils_js_1.isTag)(elem))
            matched.push(elem);
    }
    return matched;
}, _removeDuplicates);
/**
 * Gets all the preceding siblings up to but not including the element matched
 * by the selector, optionally filtered by another selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').prevUntil('.apple');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prevUntil/}
 */
exports.prevUntil = _matchUntil(function (el) { return (0, domutils_1.prevElementSibling)(el); }, _removeDuplicates);
/**
 * Get the siblings of each element (excluding the element) in the set of
 * matched elements, optionally filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').siblings().length;
 * //=> 2
 *
 * $('.pear').siblings('.orange').length;
 * //=> 1
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The siblings.
 * @see {@link https://api.jquery.com/siblings/}
 */
exports.siblings = _matcher(function (elem) {
    return (0, domutils_1.getSiblings)(elem).filter(function (el) { return (0, utils_js_1.isTag)(el) && el !== elem; });
}, domutils_1.uniqueSort);
/**
 * Gets the element children of each element in the set of matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().length;
 * //=> 3
 *
 * $('#fruits').children('.pear').text();
 * //=> Pear
 * ```
 *
 * @param selector - If specified filter for children.
 * @returns The children.
 * @see {@link https://api.jquery.com/children/}
 */
exports.children = _matcher(function (elem) { return (0, domutils_1.getChildren)(elem).filter(utils_js_1.isTag); }, _removeDuplicates);
/**
 * Gets the children of each element in the set of matched elements, including
 * text and comment nodes.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').contents().length;
 * //=> 3
 * ```
 *
 * @returns The children.
 * @see {@link https://api.jquery.com/contents/}
 */
function contents() {
    var elems = this.toArray().reduce(function (newElems, elem) {
        return (0, domhandler_1.hasChildren)(elem) ? newElems.concat(elem.children) : newElems;
    }, []);
    return this._make(elems);
}
exports.contents = contents;
/**
 * Iterates over a cheerio object, executing a function for each matched
 * element. When the callback is fired, the function is fired in the context of
 * the DOM element, so `this` refers to the current element, which is equivalent
 * to the function parameter `element`. To break out of the `each` loop early,
 * return with `false`.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * const fruits = [];
 *
 * $('li').each(function (i, elem) {
 *   fruits[i] = $(this).text();
 * });
 *
 * fruits.join(', ');
 * //=> Apple, Orange, Pear
 * ```
 *
 * @param fn - Function to execute.
 * @returns The instance itself, useful for chaining.
 * @see {@link https://api.jquery.com/each/}
 */
function each(fn) {
    var i = 0;
    var len = this.length;
    while (i < len && fn.call(this[i], i, this[i]) !== false)
        ++i;
    return this;
}
exports.each = each;
/**
 * Pass each element in the current matched set through a function, producing a
 * new Cheerio object containing the return values. The function can return an
 * individual data item or an array of data items to be inserted into the
 * resulting set. If an array is returned, the elements inside the array are
 * inserted into the set. If the function returns null or undefined, no element
 * will be inserted.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li')
 *   .map(function (i, el) {
 *     // this === el
 *     return $(this).text();
 *   })
 *   .toArray()
 *   .join(' ');
 * //=> "apple orange pear"
 * ```
 *
 * @param fn - Function to execute.
 * @returns The mapped elements, wrapped in a Cheerio collection.
 * @see {@link https://api.jquery.com/map/}
 */
function map(fn) {
    var elems = [];
    for (var i = 0; i < this.length; i++) {
        var el = this[i];
        var val = fn.call(el, i, el);
        if (val != null) {
            elems = elems.concat(val);
        }
    }
    return this._make(elems);
}
exports.map = map;
/**
 * Creates a function to test if a filter is matched.
 *
 * @param match - A filter.
 * @returns A function that determines if a filter has been matched.
 */
function getFilterFn(match) {
    if (typeof match === 'function') {
        return function (el, i) { return match.call(el, i, el); };
    }
    if ((0, utils_js_1.isCheerio)(match)) {
        return function (el) { return Array.prototype.includes.call(match, el); };
    }
    return function (el) {
        return match === el;
    };
}
function filter(match) {
    var _a;
    return this._make(filterArray(this.toArray(), match, this.options.xmlMode, (_a = this._root) === null || _a === void 0 ? void 0 : _a[0]));
}
exports.filter = filter;
function filterArray(nodes, match, xmlMode, root) {
    return typeof match === 'string'
        ? select.filter(match, nodes, { xmlMode: xmlMode, root: root })
        : nodes.filter(getFilterFn(match));
}
exports.filterArray = filterArray;
/**
 * Checks the current list of elements and returns `true` if _any_ of the
 * elements match the selector. If using an element or Cheerio selection,
 * returns `true` if _any_ of the elements match. If using a predicate function,
 * the function is executed in the context of the selected element, so `this`
 * refers to the current element.
 *
 * @category Attributes
 * @param selector - Selector for the selection.
 * @returns Whether or not the selector matches an element of the instance.
 * @see {@link https://api.jquery.com/is/}
 */
function is(selector) {
    var nodes = this.toArray();
    return typeof selector === 'string'
        ? select.some(nodes.filter(utils_js_1.isTag), selector, this.options)
        : selector
            ? nodes.some(getFilterFn(selector))
            : false;
}
exports.is = is;
/**
 * Remove elements from the set of matched elements. Given a Cheerio object that
 * represents a set of DOM elements, the `.not()` method constructs a new
 * Cheerio object from a subset of the matching elements. The supplied selector
 * is tested against each element; the elements that don't match the selector
 * will be included in the result.
 *
 * The `.not()` method can take a function as its argument in the same way that
 * `.filter()` does. Elements for which the function returns `true` are excluded
 * from the filtered set; all other elements are included.
 *
 * @category Traversing
 * @example <caption>Selector</caption>
 *
 * ```js
 * $('li').not('.apple').length;
 * //=> 2
 * ```
 *
 * @example <caption>Function</caption>
 *
 * ```js
 * $('li').not(function (i, el) {
 *   // this === el
 *   return $(this).attr('class') === 'orange';
 * }).length; //=> 2
 * ```
 *
 * @param match - Value to look for, following the rules above.
 * @param container - Optional node to filter instead.
 * @returns The filtered collection.
 * @see {@link https://api.jquery.com/not/}
 */
function not(match) {
    var nodes = this.toArray();
    if (typeof match === 'string') {
        var matches_1 = new Set(select.filter(match, nodes, this.options));
        nodes = nodes.filter(function (el) { return !matches_1.has(el); });
    }
    else {
        var filterFn_1 = getFilterFn(match);
        nodes = nodes.filter(function (el, i) { return !filterFn_1(el, i); });
    }
    return this._make(nodes);
}
exports.not = not;
/**
 * Filters the set of matched elements to only those which have the given DOM
 * element as a descendant or which have a descendant that matches the given
 * selector. Equivalent to `.filter(':has(selector)')`.
 *
 * @category Traversing
 * @example <caption>Selector</caption>
 *
 * ```js
 * $('ul').has('.pear').attr('id');
 * //=> fruits
 * ```
 *
 * @example <caption>Element</caption>
 *
 * ```js
 * $('ul').has($('.pear')[0]).attr('id');
 * //=> fruits
 * ```
 *
 * @param selectorOrHaystack - Element to look for.
 * @returns The filtered collection.
 * @see {@link https://api.jquery.com/has/}
 */
function has(selectorOrHaystack) {
    var _this = this;
    return this.filter(typeof selectorOrHaystack === 'string'
        ? // Using the `:has` selector here short-circuits searches.
            ":has(".concat(selectorOrHaystack, ")")
        : function (_, el) { return _this._make(el).find(selectorOrHaystack).length > 0; });
}
exports.has = has;
/**
 * Will select the first element of a cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().first().text();
 * //=> Apple
 * ```
 *
 * @returns The first element.
 * @see {@link https://api.jquery.com/first/}
 */
function first() {
    return this.length > 1 ? this._make(this[0]) : this;
}
exports.first = first;
/**
 * Will select the last element of a cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().last().text();
 * //=> Pear
 * ```
 *
 * @returns The last element.
 * @see {@link https://api.jquery.com/last/}
 */
function last() {
    return this.length > 0 ? this._make(this[this.length - 1]) : this;
}
exports.last = last;
/**
 * Reduce the set of matched elements to the one at the specified index. Use
 * `.eq(-i)` to count backwards from the last selected element.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).text();
 * //=> Apple
 *
 * $('li').eq(-1).text();
 * //=> Pear
 * ```
 *
 * @param i - Index of the element to select.
 * @returns The element at the `i`th position.
 * @see {@link https://api.jquery.com/eq/}
 */
function eq(i) {
    var _a;
    i = +i;
    // Use the first identity optimization if possible
    if (i === 0 && this.length <= 1)
        return this;
    if (i < 0)
        i = this.length + i;
    return this._make((_a = this[i]) !== null && _a !== void 0 ? _a : []);
}
exports.eq = eq;
function get(i) {
    if (i == null) {
        return this.toArray();
    }
    return this[i < 0 ? this.length + i : i];
}
exports.get = get;
/**
 * Retrieve all the DOM elements contained in the jQuery set as an array.
 *
 * @example
 *
 * ```js
 * $('li').toArray();
 * //=> [ {...}, {...}, {...} ]
 * ```
 *
 * @returns The contained items.
 */
function toArray() {
    return Array.prototype.slice.call(this);
}
exports.toArray = toArray;
/**
 * Search for a given element from among the matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').index();
 * //=> 2 $('.orange').index('li');
 * //=> 1
 * $('.apple').index($('#fruit, li'));
 * //=> 1
 * ```
 *
 * @param selectorOrNeedle - Element to look for.
 * @returns The index of the element.
 * @see {@link https://api.jquery.com/index/}
 */
function index(selectorOrNeedle) {
    var $haystack;
    var needle;
    if (selectorOrNeedle == null) {
        $haystack = this.parent().children();
        needle = this[0];
    }
    else if (typeof selectorOrNeedle === 'string') {
        $haystack = this._make(selectorOrNeedle);
        needle = this[0];
    }
    else {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        $haystack = this;
        needle = (0, utils_js_1.isCheerio)(selectorOrNeedle)
            ? selectorOrNeedle[0]
            : selectorOrNeedle;
    }
    return Array.prototype.indexOf.call($haystack, needle);
}
exports.index = index;
/**
 * Gets the elements matching the specified range (0-based position).
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').slice(1).eq(0).text();
 * //=> 'Orange'
 *
 * $('li').slice(1, 2).length;
 * //=> 1
 * ```
 *
 * @param start - A position at which the elements begin to be selected. If
 *   negative, it indicates an offset from the end of the set.
 * @param end - A position at which the elements stop being selected. If
 *   negative, it indicates an offset from the end of the set. If omitted, the
 *   range continues until the end of the set.
 * @returns The elements matching the specified range.
 * @see {@link https://api.jquery.com/slice/}
 */
function slice(start, end) {
    return this._make(Array.prototype.slice.call(this, start, end));
}
exports.slice = slice;
/**
 * End the most recent filtering operation in the current chain and return the
 * set of matched elements to its previous state.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).end().length;
 * //=> 3
 * ```
 *
 * @returns The previous state of the set of matched elements.
 * @see {@link https://api.jquery.com/end/}
 */
function end() {
    var _a;
    return (_a = this.prevObject) !== null && _a !== void 0 ? _a : this._make([]);
}
exports.end = end;
/**
 * Add elements to the set of matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').add('.orange').length;
 * //=> 2
 * ```
 *
 * @param other - Elements to add.
 * @param context - Optionally the context of the new selection.
 * @returns The combined set.
 * @see {@link https://api.jquery.com/add/}
 */
function add(other, context) {
    var selection = this._make(other, context);
    var contents = (0, domutils_1.uniqueSort)(__spreadArray(__spreadArray([], this.get(), true), selection.get(), true));
    return this._make(contents);
}
exports.add = add;
/**
 * Add the previous set of elements on the stack to the current set, optionally
 * filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).addBack('.orange').length;
 * //=> 2
 * ```
 *
 * @param selector - Selector for the elements to add.
 * @returns The combined set.
 * @see {@link https://api.jquery.com/addBack/}
 */
function addBack(selector) {
    return this.prevObject
        ? this.add(selector ? this.prevObject.filter(selector) : this.prevObject)
        : this;
}
exports.addBack = addBack;
//# sourceMappingURL=traversing.js.map