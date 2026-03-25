"use strict";
/**
 * Methods for modifying the DOM structure.
 *
 * @module cheerio/manipulation
 */
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
exports.clone = exports.text = exports.toString = exports.html = exports.empty = exports.replaceWith = exports.remove = exports.insertBefore = exports.before = exports.insertAfter = exports.after = exports.wrapAll = exports.unwrap = exports.wrapInner = exports.wrap = exports.prepend = exports.append = exports.prependTo = exports.appendTo = exports._makeDomArray = void 0;
var domhandler_1 = require("domhandler");
var parse_js_1 = require("../parse.js");
var static_js_1 = require("../static.js");
var utils_js_1 = require("../utils.js");
var domutils_1 = require("domutils");
/**
 * Create an array of nodes, recursing into arrays and parsing strings if necessary.
 *
 * @private
 * @category Manipulation
 * @param elem - Elements to make an array of.
 * @param clone - Optionally clone nodes.
 * @returns The array of nodes.
 */
function _makeDomArray(elem, clone) {
    var _this = this;
    if (elem == null) {
        return [];
    }
    if ((0, utils_js_1.isCheerio)(elem)) {
        return clone ? (0, utils_js_1.cloneDom)(elem.get()) : elem.get();
    }
    if (Array.isArray(elem)) {
        return elem.reduce(function (newElems, el) { return newElems.concat(_this._makeDomArray(el, clone)); }, []);
    }
    if (typeof elem === 'string') {
        return this._parse(elem, this.options, false, null).children;
    }
    return clone ? (0, utils_js_1.cloneDom)([elem]) : [elem];
}
exports._makeDomArray = _makeDomArray;
function _insert(concatenator) {
    return function () {
        var _this = this;
        var elems = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            elems[_i] = arguments[_i];
        }
        var lastIdx = this.length - 1;
        return (0, utils_js_1.domEach)(this, function (el, i) {
            if (!(0, domhandler_1.hasChildren)(el))
                return;
            var domSrc = typeof elems[0] === 'function'
                ? elems[0].call(el, i, _this._render(el.children))
                : elems;
            var dom = _this._makeDomArray(domSrc, i < lastIdx);
            concatenator(dom, el.children, el);
        });
    };
}
/**
 * Modify an array in-place, removing some number of elements and adding new
 * elements directly following them.
 *
 * @private
 * @category Manipulation
 * @param array - Target array to splice.
 * @param spliceIdx - Index at which to begin changing the array.
 * @param spliceCount - Number of elements to remove from the array.
 * @param newElems - Elements to insert into the array.
 * @param parent - The parent of the node.
 * @returns The spliced array.
 */
function uniqueSplice(array, spliceIdx, spliceCount, newElems, parent) {
    var _a, _b;
    var spliceArgs = __spreadArray([
        spliceIdx,
        spliceCount
    ], newElems, true);
    var prev = spliceIdx === 0 ? null : array[spliceIdx - 1];
    var next = spliceIdx + spliceCount >= array.length
        ? null
        : array[spliceIdx + spliceCount];
    /*
     * Before splicing in new elements, ensure they do not already appear in the
     * current array.
     */
    for (var idx = 0; idx < newElems.length; ++idx) {
        var node = newElems[idx];
        var oldParent = node.parent;
        if (oldParent) {
            var oldSiblings = oldParent.children;
            var prevIdx = oldSiblings.indexOf(node);
            if (prevIdx > -1) {
                oldParent.children.splice(prevIdx, 1);
                if (parent === oldParent && spliceIdx > prevIdx) {
                    spliceArgs[0]--;
                }
            }
        }
        node.parent = parent;
        if (node.prev) {
            node.prev.next = (_a = node.next) !== null && _a !== void 0 ? _a : null;
        }
        if (node.next) {
            node.next.prev = (_b = node.prev) !== null && _b !== void 0 ? _b : null;
        }
        node.prev = idx === 0 ? prev : newElems[idx - 1];
        node.next = idx === newElems.length - 1 ? next : newElems[idx + 1];
    }
    if (prev) {
        prev.next = newElems[0];
    }
    if (next) {
        next.prev = newElems[newElems.length - 1];
    }
    return array.splice.apply(array, spliceArgs);
}
/**
 * Insert every element in the set of matched elements to the end of the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').appendTo('#fruits');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //      <li class="plum">Plum</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to append elements to.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/appendTo/}
 */
function appendTo(target) {
    var appendTarget = (0, utils_js_1.isCheerio)(target) ? target : this._make(target);
    appendTarget.append(this);
    return this;
}
exports.appendTo = appendTo;
/**
 * Insert every element in the set of matched elements to the beginning of the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').prependTo('#fruits');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to prepend elements to.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/prependTo/}
 */
function prependTo(target) {
    var prependTarget = (0, utils_js_1.isCheerio)(target) ? target : this._make(target);
    prependTarget.prepend(this);
    return this;
}
exports.prependTo = prependTo;
/**
 * Inserts content as the _last_ child of each of the selected elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').append('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //      <li class="plum">Plum</li>
 * //    </ul>
 * ```
 *
 * @see {@link https://api.jquery.com/append/}
 */
exports.append = _insert(function (dom, children, parent) {
    uniqueSplice(children, children.length, 0, dom, parent);
});
/**
 * Inserts content as the _first_ child of each of the selected elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').prepend('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @see {@link https://api.jquery.com/prepend/}
 */
exports.prepend = _insert(function (dom, children, parent) {
    uniqueSplice(children, 0, 0, dom, parent);
});
function _wrap(insert) {
    return function (wrapper) {
        var lastIdx = this.length - 1;
        var lastParent = this.parents().last();
        for (var i = 0; i < this.length; i++) {
            var el = this[i];
            var wrap_1 = typeof wrapper === 'function'
                ? wrapper.call(el, i, el)
                : typeof wrapper === 'string' && !(0, utils_js_1.isHtml)(wrapper)
                    ? lastParent.find(wrapper).clone()
                    : wrapper;
            var wrapperDom = this._makeDomArray(wrap_1, i < lastIdx)[0];
            if (!wrapperDom || !(0, domhandler_1.hasChildren)(wrapperDom))
                continue;
            var elInsertLocation = wrapperDom;
            /*
             * Find the deepest child. Only consider the first tag child of each node
             * (ignore text); stop if no children are found.
             */
            var j = 0;
            while (j < elInsertLocation.children.length) {
                var child = elInsertLocation.children[j];
                if ((0, utils_js_1.isTag)(child)) {
                    elInsertLocation = child;
                    j = 0;
                }
                else {
                    j++;
                }
            }
            insert(el, elInsertLocation, [wrapperDom]);
        }
        return this;
    };
}
/**
 * The .wrap() function can take any string or object that could be passed to
 * the $() factory function to specify a DOM structure. This structure may be
 * nested several levels deep, but should contain only one inmost element. A
 * copy of this structure will be wrapped around each of the elements in the set
 * of matched elements. This method returns the original set of elements for
 * chaining purposes.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const redFruit = $('<div class="red-fruit"></div>');
 * $('.apple').wrap(redFruit);
 *
 * //=> <ul id="fruits">
 * //     <div class="red-fruit">
 * //      <li class="apple">Apple</li>
 * //     </div>
 * //     <li class="orange">Orange</li>
 * //     <li class="plum">Plum</li>
 * //   </ul>
 *
 * const healthy = $('<div class="healthy"></div>');
 * $('li').wrap(healthy);
 *
 * //=> <ul id="fruits">
 * //     <div class="healthy">
 * //       <li class="apple">Apple</li>
 * //     </div>
 * //     <div class="healthy">
 * //       <li class="orange">Orange</li>
 * //     </div>
 * //     <div class="healthy">
 * //        <li class="plum">Plum</li>
 * //     </div>
 * //   </ul>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around each element in the selection.
 * @see {@link https://api.jquery.com/wrap/}
 */
exports.wrap = _wrap(function (el, elInsertLocation, wrapperDom) {
    var parent = el.parent;
    if (!parent)
        return;
    var siblings = parent.children;
    var index = siblings.indexOf(el);
    (0, parse_js_1.update)([el], elInsertLocation);
    /*
     * The previous operation removed the current element from the `siblings`
     * array, so the `dom` array can be inserted without removing any
     * additional elements.
     */
    uniqueSplice(siblings, index, 0, wrapperDom, parent);
});
/**
 * The .wrapInner() function can take any string or object that could be passed
 * to the $() factory function to specify a DOM structure. This structure may be
 * nested several levels deep, but should contain only one inmost element. The
 * structure will be wrapped around the content of each of the elements in the
 * set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const redFruit = $('<div class="red-fruit"></div>');
 * $('.apple').wrapInner(redFruit);
 *
 * //=> <ul id="fruits">
 * //     <li class="apple">
 * //       <div class="red-fruit">Apple</div>
 * //     </li>
 * //     <li class="orange">Orange</li>
 * //     <li class="pear">Pear</li>
 * //   </ul>
 *
 * const healthy = $('<div class="healthy"></div>');
 * $('li').wrapInner(healthy);
 *
 * //=> <ul id="fruits">
 * //     <li class="apple">
 * //       <div class="healthy">Apple</div>
 * //     </li>
 * //     <li class="orange">
 * //       <div class="healthy">Orange</div>
 * //     </li>
 * //     <li class="pear">
 * //       <div class="healthy">Pear</div>
 * //     </li>
 * //   </ul>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around the content of each element
 *   in the selection.
 * @returns The instance itself, for chaining.
 * @see {@link https://api.jquery.com/wrapInner/}
 */
exports.wrapInner = _wrap(function (el, elInsertLocation, wrapperDom) {
    if (!(0, domhandler_1.hasChildren)(el))
        return;
    (0, parse_js_1.update)(el.children, elInsertLocation);
    (0, parse_js_1.update)(wrapperDom, el);
});
/**
 * The .unwrap() function, removes the parents of the set of matched elements
 * from the DOM, leaving the matched elements in their place.
 *
 * @category Manipulation
 * @example <caption>without selector</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div id=test>\n  <div><p>Hello</p></div>\n  <div><p>World</p></div>\n</div>'
 * );
 * $('#test p').unwrap();
 *
 * //=> <div id=test>
 * //     <p>Hello</p>
 * //     <p>World</p>
 * //   </div>
 * ```
 *
 * @example <caption>with selector</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div id=test>\n  <p>Hello</p>\n  <b><p>World</p></b>\n</div>'
 * );
 * $('#test p').unwrap('b');
 *
 * //=> <div id=test>
 * //     <p>Hello</p>
 * //     <p>World</p>
 * //   </div>
 * ```
 *
 * @param selector - A selector to check the parent element against. If an
 *   element's parent does not match the selector, the element won't be unwrapped.
 * @returns The instance itself, for chaining.
 * @see {@link https://api.jquery.com/unwrap/}
 */
function unwrap(selector) {
    var _this = this;
    this.parent(selector)
        .not('body')
        .each(function (_, el) {
        _this._make(el).replaceWith(el.children);
    });
    return this;
}
exports.unwrap = unwrap;
/**
 * The .wrapAll() function can take any string or object that could be passed to
 * the $() function to specify a DOM structure. This structure may be nested
 * several levels deep, but should contain only one inmost element. The
 * structure will be wrapped around all of the elements in the set of matched
 * elements, as a single group.
 *
 * @category Manipulation
 * @example <caption>With markup passed to `wrapAll`</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div class="container"><div class="inner">First</div><div class="inner">Second</div></div>'
 * );
 * $('.inner').wrapAll("<div class='new'></div>");
 *
 * //=> <div class="container">
 * //     <div class='new'>
 * //       <div class="inner">First</div>
 * //       <div class="inner">Second</div>
 * //     </div>
 * //   </div>
 * ```
 *
 * @example <caption>With an existing cheerio instance</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<span>Span 1</span><strong>Strong</strong><span>Span 2</span>'
 * );
 * const wrap = $('<div><p><em><b></b></em></p></div>');
 * $('span').wrapAll(wrap);
 *
 * //=> <div>
 * //     <p>
 * //       <em>
 * //         <b>
 * //           <span>Span 1</span>
 * //           <span>Span 2</span>
 * //         </b>
 * //       </em>
 * //     </p>
 * //   </div>
 * //   <strong>Strong</strong>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around all matched elements in the
 *   selection.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/wrapAll/}
 */
function wrapAll(wrapper) {
    var el = this[0];
    if (el) {
        var wrap_2 = this._make(typeof wrapper === 'function' ? wrapper.call(el, 0, el) : wrapper).insertBefore(el);
        // If html is given as wrapper, wrap may contain text elements
        var elInsertLocation = void 0;
        for (var i = 0; i < wrap_2.length; i++) {
            if (wrap_2[i].type === 'tag')
                elInsertLocation = wrap_2[i];
        }
        var j = 0;
        /*
         * Find the deepest child. Only consider the first tag child of each node
         * (ignore text); stop if no children are found.
         */
        while (elInsertLocation && j < elInsertLocation.children.length) {
            var child = elInsertLocation.children[j];
            if (child.type === 'tag') {
                elInsertLocation = child;
                j = 0;
            }
            else {
                j++;
            }
        }
        if (elInsertLocation)
            this._make(elInsertLocation).append(this);
    }
    return this;
}
exports.wrapAll = wrapAll;
/* eslint-disable jsdoc/check-param-names*/
/**
 * Insert content next to each element in the set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.apple').after('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="plum">Plum</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param content - HTML string, DOM element, array of DOM elements or Cheerio
 *   to insert after each element in the set of matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/after/}
 */
function after() {
    var _this = this;
    var elems = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        elems[_i] = arguments[_i];
    }
    var lastIdx = this.length - 1;
    return (0, utils_js_1.domEach)(this, function (el, i) {
        var parent = el.parent;
        if (!(0, domhandler_1.hasChildren)(el) || !parent) {
            return;
        }
        var siblings = parent.children;
        var index = siblings.indexOf(el);
        // If not found, move on
        /* istanbul ignore next */
        if (index < 0)
            return;
        var domSrc = typeof elems[0] === 'function'
            ? elems[0].call(el, i, _this._render(el.children))
            : elems;
        var dom = _this._makeDomArray(domSrc, i < lastIdx);
        // Add element after `this` element
        uniqueSplice(siblings, index + 1, 0, dom, parent);
    });
}
exports.after = after;
/* eslint-enable jsdoc/check-param-names*/
/**
 * Insert every element in the set of matched elements after the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').insertAfter('.apple');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="plum">Plum</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to insert elements after.
 * @returns The set of newly inserted elements.
 * @see {@link https://api.jquery.com/insertAfter/}
 */
function insertAfter(target) {
    var _this = this;
    if (typeof target === 'string') {
        target = this._make(target);
    }
    this.remove();
    var clones = [];
    this._makeDomArray(target).forEach(function (el) {
        var clonedSelf = _this.clone().toArray();
        var parent = el.parent;
        if (!parent) {
            return;
        }
        var siblings = parent.children;
        var index = siblings.indexOf(el);
        // If not found, move on
        /* istanbul ignore next */
        if (index < 0)
            return;
        // Add cloned `this` element(s) after target element
        uniqueSplice(siblings, index + 1, 0, clonedSelf, parent);
        clones.push.apply(clones, clonedSelf);
    });
    return this._make(clones);
}
exports.insertAfter = insertAfter;
/* eslint-disable jsdoc/check-param-names*/
/**
 * Insert content previous to each element in the set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.apple').before('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param content - HTML string, DOM element, array of DOM elements or Cheerio
 *   to insert before each element in the set of matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/before/}
 */
function before() {
    var _this = this;
    var elems = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        elems[_i] = arguments[_i];
    }
    var lastIdx = this.length - 1;
    return (0, utils_js_1.domEach)(this, function (el, i) {
        var parent = el.parent;
        if (!(0, domhandler_1.hasChildren)(el) || !parent) {
            return;
        }
        var siblings = parent.children;
        var index = siblings.indexOf(el);
        // If not found, move on
        /* istanbul ignore next */
        if (index < 0)
            return;
        var domSrc = typeof elems[0] === 'function'
            ? elems[0].call(el, i, _this._render(el.children))
            : elems;
        var dom = _this._makeDomArray(domSrc, i < lastIdx);
        // Add element before `el` element
        uniqueSplice(siblings, index, 0, dom, parent);
    });
}
exports.before = before;
/* eslint-enable jsdoc/check-param-names*/
/**
 * Insert every element in the set of matched elements before the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').insertBefore('.apple');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to insert elements before.
 * @returns The set of newly inserted elements.
 * @see {@link https://api.jquery.com/insertBefore/}
 */
function insertBefore(target) {
    var _this = this;
    var targetArr = this._make(target);
    this.remove();
    var clones = [];
    (0, utils_js_1.domEach)(targetArr, function (el) {
        var clonedSelf = _this.clone().toArray();
        var parent = el.parent;
        if (!parent) {
            return;
        }
        var siblings = parent.children;
        var index = siblings.indexOf(el);
        // If not found, move on
        /* istanbul ignore next */
        if (index < 0)
            return;
        // Add cloned `this` element(s) after target element
        uniqueSplice(siblings, index, 0, clonedSelf, parent);
        clones.push.apply(clones, clonedSelf);
    });
    return this._make(clones);
}
exports.insertBefore = insertBefore;
/**
 * Removes the set of matched elements from the DOM and all their children.
 * `selector` filters the set of matched elements to be removed.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.pear').remove();
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //    </ul>
 * ```
 *
 * @param selector - Optional selector for elements to remove.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/remove/}
 */
function remove(selector) {
    // Filter if we have selector
    var elems = selector ? this.filter(selector) : this;
    (0, utils_js_1.domEach)(elems, function (el) {
        (0, domutils_1.removeElement)(el);
        el.prev = el.next = el.parent = null;
    });
    return this;
}
exports.remove = remove;
/**
 * Replaces matched elements with `content`.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const plum = $('<li class="plum">Plum</li>');
 * $('.pear').replaceWith(plum);
 * $.html();
 * //=> <ul id="fruits">
 * //     <li class="apple">Apple</li>
 * //     <li class="orange">Orange</li>
 * //     <li class="plum">Plum</li>
 * //   </ul>
 * ```
 *
 * @param content - Replacement for matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/replaceWith/}
 */
function replaceWith(content) {
    var _this = this;
    return (0, utils_js_1.domEach)(this, function (el, i) {
        var parent = el.parent;
        if (!parent) {
            return;
        }
        var siblings = parent.children;
        var cont = typeof content === 'function' ? content.call(el, i, el) : content;
        var dom = _this._makeDomArray(cont);
        /*
         * In the case that `dom` contains nodes that already exist in other
         * structures, ensure those nodes are properly removed.
         */
        (0, parse_js_1.update)(dom, null);
        var index = siblings.indexOf(el);
        // Completely remove old element
        uniqueSplice(siblings, index, 1, dom, parent);
        if (!dom.includes(el)) {
            el.parent = el.prev = el.next = null;
        }
    });
}
exports.replaceWith = replaceWith;
/**
 * Empties an element, removing all its children.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').empty();
 * $.html();
 * //=>  <ul id="fruits"></ul>
 * ```
 *
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/empty/}
 */
function empty() {
    return (0, utils_js_1.domEach)(this, function (el) {
        if (!(0, domhandler_1.hasChildren)(el))
            return;
        el.children.forEach(function (child) {
            child.next = child.prev = child.parent = null;
        });
        el.children.length = 0;
    });
}
exports.empty = empty;
function html(str) {
    var _this = this;
    if (str === undefined) {
        var el = this[0];
        if (!el || !(0, domhandler_1.hasChildren)(el))
            return null;
        return this._render(el.children);
    }
    return (0, utils_js_1.domEach)(this, function (el) {
        if (!(0, domhandler_1.hasChildren)(el))
            return;
        el.children.forEach(function (child) {
            child.next = child.prev = child.parent = null;
        });
        var content = (0, utils_js_1.isCheerio)(str)
            ? str.toArray()
            : _this._parse("".concat(str), _this.options, false, el).children;
        (0, parse_js_1.update)(content, el);
    });
}
exports.html = html;
/**
 * Turns the collection to a string. Alias for `.html()`.
 *
 * @category Manipulation
 * @returns The rendered document.
 */
function toString() {
    return this._render(this);
}
exports.toString = toString;
function text(str) {
    var _this = this;
    // If `str` is undefined, act as a "getter"
    if (str === undefined) {
        return (0, static_js_1.text)(this);
    }
    if (typeof str === 'function') {
        // Function support
        return (0, utils_js_1.domEach)(this, function (el, i) {
            return _this._make(el).text(str.call(el, i, (0, static_js_1.text)([el])));
        });
    }
    // Append text node to each selected elements
    return (0, utils_js_1.domEach)(this, function (el) {
        if (!(0, domhandler_1.hasChildren)(el))
            return;
        el.children.forEach(function (child) {
            child.next = child.prev = child.parent = null;
        });
        var textNode = new domhandler_1.Text("".concat(str));
        (0, parse_js_1.update)(textNode, el);
    });
}
exports.text = text;
/**
 * Clone the cheerio object.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const moreFruit = $('#fruits').clone();
 * ```
 *
 * @returns The cloned object.
 * @see {@link https://api.jquery.com/clone/}
 */
function clone() {
    return this._make((0, utils_js_1.cloneDom)(this.get()));
}
exports.clone = clone;
//# sourceMappingURL=manipulation.js.map