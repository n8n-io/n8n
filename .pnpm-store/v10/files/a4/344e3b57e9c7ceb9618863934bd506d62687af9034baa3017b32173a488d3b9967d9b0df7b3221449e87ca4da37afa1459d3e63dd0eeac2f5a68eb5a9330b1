'use strict';
/**
 * Methods for traversing the DOM structure.
 *
 * @module cheerio/traversing
 */

var select = require('cheerio-select');
var utils = require('../utils');
var domEach = utils.domEach;
var uniqueSort = require('htmlparser2').DomUtils.uniqueSort;
var isTag = utils.isTag;
var slice = Array.prototype.slice;
var reSiblingSelector = /^\s*[~+]/;

/**
 * Get the descendants of each element in the current set of matched elements,
 * filtered by a selector, jQuery object, or element.
 *
 * @example
 *   $('#fruits').find('li').length;
 *   //=> 3
 *   $('#fruits').find($('.apple')).length;
 *   //=> 1
 *
 * @param {string | Cheerio | Node} selectorOrHaystack - Element to look for.
 * @returns {Cheerio} The found elements.
 * @see {@link https://api.jquery.com/find/}
 */
exports.find = function (selectorOrHaystack) {
  if (!selectorOrHaystack) {
    return this._make([]);
  }

  var context = this.toArray();

  if (typeof selectorOrHaystack !== 'string') {
    var contains = this.constructor.contains;
    var haystack = selectorOrHaystack.cheerio
      ? selectorOrHaystack.get()
      : [selectorOrHaystack];

    return this._make(
      haystack.filter(function (elem) {
        return context.some(function (node) {
          return contains(node, elem);
        });
      })
    );
  }

  var elems = reSiblingSelector.test(selectorOrHaystack)
    ? context
    : context.reduce(function (newElems, elem) {
        return Array.isArray(elem.children)
          ? newElems.concat(elem.children.filter(isTag))
          : newElems;
      }, []);

  var options = Object.assign({ context: context }, this.options);

  return this._make(select.select(selectorOrHaystack, elems, options));
};

/**
 * Get the parent of each element in the current set of matched elements,
 * optionally filtered by a selector.
 *
 * @example
 *   $('.pear').parent().attr('id');
 *   //=> fruits
 *
 * @param {string} [selector] - If specified filter for parent.
 * @returns {Cheerio} The parents.
 * @see {@link https://api.jquery.com/parent/}
 */
exports.parent = function (selector) {
  var set = [];

  domEach(this, function (_, elem) {
    var parentElem = elem.parent;
    if (
      parentElem &&
      parentElem.type !== 'root' &&
      set.indexOf(parentElem) < 0
    ) {
      set.push(parentElem);
    }
  });

  if (selector) {
    set = exports.filter.call(set, selector, this);
  }

  return this._make(set);
};

/**
 * Get a set of parents filtered by `selector` of each element in the current
 * set of match elements.
 *
 * @example
 *   $('.orange').parents().length;
 *   // => 2
 *   $('.orange').parents('#fruits').length;
 *   // => 1
 *
 * @param {string} [selector] - If specified filter for parents.
 * @returns {Cheerio} The parents.
 * @see {@link https://api.jquery.com/parents/}
 */
exports.parents = function (selector) {
  var parentNodes = [];

  // When multiple DOM elements are in the original set, the resulting set will
  // be in *reverse* order of the original elements as well, with duplicates
  // removed.
  this.get()
    .reverse()
    .forEach(function (elem) {
      traverseParents(this, elem.parent, selector, Infinity).forEach(function (
        node
      ) {
        if (parentNodes.indexOf(node) === -1) {
          parentNodes.push(node);
        }
      });
    }, this);

  return this._make(parentNodes);
};

/**
 * Get the ancestors of each element in the current set of matched elements, up
 * to but not including the element matched by the selector, DOM node, or cheerio object.
 *
 * @example
 *   $('.orange').parentsUntil('#food').length;
 *   // => 1
 *
 * @param {string | Node | Cheerio} selector - Selector for element to stop at.
 * @param {string | Function} [filter] - Optional filter for parents.
 * @returns {Cheerio} The parents.
 * @see {@link https://api.jquery.com/parentsUntil/}
 */
exports.parentsUntil = function (selector, filter) {
  var parentNodes = [];
  var untilNode;
  var untilNodes;

  if (typeof selector === 'string') {
    untilNodes = this.parents(selector).toArray();
  } else if (selector && selector.cheerio) {
    untilNodes = selector.toArray();
  } else if (selector) {
    untilNode = selector;
  }

  // When multiple DOM elements are in the original set, the resulting set will
  // be in *reverse* order of the original elements as well, with duplicates
  // removed.

  this.toArray()
    .reverse()
    .forEach(function (elem) {
      while ((elem = elem.parent)) {
        if (
          (untilNode && elem !== untilNode) ||
          (untilNodes && untilNodes.indexOf(elem) === -1) ||
          (!untilNode && !untilNodes)
        ) {
          if (isTag(elem) && parentNodes.indexOf(elem) === -1) {
            parentNodes.push(elem);
          }
        } else {
          break;
        }
      }
    }, this);

  return filter
    ? exports.filter.call(parentNodes, filter, this)
    : this._make(parentNodes);
};

/**
 * For each element in the set, get the first element that matches the selector
 * by testing the element itself and traversing up through its ancestors in the DOM tree.
 *
 * @example
 *   $('.orange').closest();
 *   // => []
 *   $('.orange').closest('.apple');
 *   // => []
 *   $('.orange').closest('li');
 *   // => [<li class="orange">Orange</li>]
 *   $('.orange').closest('#fruits');
 *   // => [<ul id="fruits"> ... </ul>]
 *
 * @param {string} [selector] - Selector for the element to find.
 * @returns {Cheerio} The closest nodes.
 * @see {@link https://api.jquery.com/closest/}
 */
exports.closest = function (selector) {
  var set = [];

  if (!selector) {
    return this._make(set);
  }

  domEach(this, function (_, elem) {
    var closestElem = traverseParents(this, elem, selector, 1)[0];

    // Do not add duplicate elements to the set
    if (closestElem && set.indexOf(closestElem) < 0) {
      set.push(closestElem);
    }
  });

  return this._make(set);
};

/**
 * Gets the next sibling of the first selected element, optionally filtered by a selector.
 *
 * @example
 *   $('.apple').next().hasClass('orange');
 *   //=> true
 *
 * @param {string} [selector] - If specified filter for sibling.
 * @returns {Cheerio} The next nodes.
 * @see {@link https://api.jquery.com/next/}
 */
exports.next = function (selector) {
  if (!this[0]) {
    return this;
  }
  var elems = [];

  domEach(this, function (_, elem) {
    while ((elem = elem.next)) {
      if (isTag(elem)) {
        elems.push(elem);
        return;
      }
    }
  });

  return selector
    ? exports.filter.call(elems, selector, this)
    : this._make(elems);
};

/**
 * Gets all the following siblings of the first selected element, optionally
 * filtered by a selector.
 *
 * @example
 *   $('.apple').nextAll();
 *   //=> [<li class="orange">Orange</li>, <li class="pear">Pear</li>]
 *   $('.apple').nextAll('.orange');
 *   //=> [<li class="orange">Orange</li>]
 *
 * @param {string} [selector] - If specified filter for siblings.
 * @returns {Cheerio} The next nodes.
 * @see {@link https://api.jquery.com/nextAll/}
 */
exports.nextAll = function (selector) {
  if (!this[0]) {
    return this;
  }
  var elems = [];

  domEach(this, function (_, elem) {
    while ((elem = elem.next)) {
      if (isTag(elem) && elems.indexOf(elem) === -1) {
        elems.push(elem);
      }
    }
  });

  return selector
    ? exports.filter.call(elems, selector, this)
    : this._make(elems);
};

/**
 * Gets all the following siblings up to but not including the element matched
 * by the selector, optionally filtered by another selector.
 *
 * @example
 *   $('.apple').nextUntil('.pear');
 *   //=> [<li class="orange">Orange</li>]
 *
 * @param {string | Cheerio | Node} selector - Selector for element to stop at.
 * @param {string} [filterSelector] - If specified filter for siblings.
 * @returns {Cheerio} The next nodes.
 * @see {@link https://api.jquery.com/nextUntil/}
 */
exports.nextUntil = function (selector, filterSelector) {
  if (!this[0]) {
    return this;
  }
  var elems = [];
  var untilNode;
  var untilNodes;

  if (typeof selector === 'string') {
    untilNodes = this.nextAll(selector).toArray();
  } else if (selector && selector.cheerio) {
    untilNodes = selector.get();
  } else if (selector) {
    untilNode = selector;
  }

  domEach(this, function (_, elem) {
    while ((elem = elem.next)) {
      if (
        (untilNode && elem !== untilNode) ||
        (untilNodes && untilNodes.indexOf(elem) === -1) ||
        (!untilNode && !untilNodes)
      ) {
        if (isTag(elem) && elems.indexOf(elem) === -1) {
          elems.push(elem);
        }
      } else {
        break;
      }
    }
  });

  return filterSelector
    ? exports.filter.call(elems, filterSelector, this)
    : this._make(elems);
};

/**
 * Gets the previous sibling of the first selected element optionally filtered
 * by a selector.
 *
 * @example
 *   $('.orange').prev().hasClass('apple');
 *   //=> true
 *
 * @param {string} [selector] - If specified filter for siblings.
 * @returns {Cheerio} The previous nodes.
 * @see {@link https://api.jquery.com/prev/}
 */
exports.prev = function (selector) {
  if (!this[0]) {
    return this;
  }
  var elems = [];

  domEach(this, function (_, elem) {
    while ((elem = elem.prev)) {
      if (isTag(elem)) {
        elems.push(elem);
        return;
      }
    }
  });

  return selector
    ? exports.filter.call(elems, selector, this)
    : this._make(elems);
};

/**
 * Gets all the preceding siblings of the first selected element, optionally
 * filtered by a selector.
 *
 * @example
 *   $('.pear').prevAll();
 *   //=> [<li class="orange">Orange</li>, <li class="apple">Apple</li>]
 *   $('.pear').prevAll('.orange');
 *   //=> [<li class="orange">Orange</li>]
 *
 * @param {string} [selector] - If specified filter for siblings.
 * @returns {Cheerio} The previous nodes.
 * @see {@link https://api.jquery.com/prevAll/}
 */
exports.prevAll = function (selector) {
  if (!this[0]) {
    return this;
  }
  var elems = [];

  domEach(this, function (_, elem) {
    while ((elem = elem.prev)) {
      if (isTag(elem) && elems.indexOf(elem) === -1) {
        elems.push(elem);
      }
    }
  });

  return selector
    ? exports.filter.call(elems, selector, this)
    : this._make(elems);
};

/**
 * Gets all the preceding siblings up to but not including the element matched
 * by the selector, optionally filtered by another selector.
 *
 * @example
 *   $('.pear').prevUntil('.apple');
 *   //=> [<li class="orange">Orange</li>]
 *
 * @param {string | Cheerio | Node} selector - Selector for element to stop at.
 * @param {string} [filterSelector] - If specified filter for siblings.
 * @returns {Cheerio} The previous nodes.
 * @see {@link https://api.jquery.com/prevUntil/}
 */
exports.prevUntil = function (selector, filterSelector) {
  if (!this[0]) {
    return this;
  }
  var elems = [];
  var untilNode;
  var untilNodes;

  if (typeof selector === 'string') {
    untilNodes = this.prevAll(selector).toArray();
  } else if (selector && selector.cheerio) {
    untilNodes = selector.get();
  } else if (selector) {
    untilNode = selector;
  }

  domEach(this, function (_, elem) {
    while ((elem = elem.prev)) {
      if (
        (untilNode && elem !== untilNode) ||
        (untilNodes && untilNodes.indexOf(elem) === -1) ||
        (!untilNode && !untilNodes)
      ) {
        if (isTag(elem) && elems.indexOf(elem) === -1) {
          elems.push(elem);
        }
      } else {
        break;
      }
    }
  });

  return filterSelector
    ? exports.filter.call(elems, filterSelector, this)
    : this._make(elems);
};

/**
 * Gets the first selected element's siblings, excluding itself.
 *
 * @example
 *   $('.pear').siblings().length;
 *   //=> 2
 *
 *   $('.pear').siblings('.orange').length;
 *   //=> 1
 *
 * @param {string} [selector] - If specified filter for siblings.
 * @returns {Cheerio} The siblings.
 * @see {@link https://api.jquery.com/siblings/}
 */
exports.siblings = function (selector) {
  var parent = this.parent();

  var elems = (parent ? parent.children() : this.siblingsAndMe())
    .toArray()
    .filter(function (elem) {
      return isTag(elem) && !this.is(elem);
    }, this);

  if (selector !== undefined) {
    return exports.filter.call(elems, selector, this);
  }
  return this._make(elems);
};

/**
 * Gets the children of the first selected element.
 *
 * @example
 *   $('#fruits').children().length;
 *   //=> 3
 *
 *   $('#fruits').children('.pear').text();
 *   //=> Pear
 *
 * @param {string} [selector] - If specified filter for children.
 * @returns {Cheerio} The children.
 * @see {@link https://api.jquery.com/children/}
 */
exports.children = function (selector) {
  var elems = this.toArray().reduce(function (newElems, elem) {
    return newElems.concat(elem.children.filter(isTag));
  }, []);

  if (selector === undefined) return this._make(elems);

  return exports.filter.call(elems, selector, this);
};

/**
 * Gets the children of each element in the set of matched elements, including
 * text and comment nodes.
 *
 * @example
 *   $('#fruits').contents().length;
 *   //=> 3
 *
 * @returns {Cheerio} The children.
 * @see {@link https://api.jquery.com/contents/}
 */
exports.contents = function () {
  var elems = this.toArray().reduce(function (newElems, elem) {
    return newElems.concat(elem.children);
  }, []);
  return this._make(elems);
};

/**
 * Iterates over a cheerio object, executing a function for each matched
 * element. When the callback is fired, the function is fired in the context of
 * the DOM element, so `this` refers to the current element, which is equivalent
 * to the function parameter `element`. To break out of the `each` loop early,
 * return with `false`.
 *
 * @example
 *   const fruits = [];
 *
 *   $('li').each(function (i, elem) {
 *     fruits[i] = $(this).text();
 *   });
 *
 *   fruits.join(', ');
 *   //=> Apple, Orange, Pear
 *
 * @param {Function} fn - Function to execute.
 * @returns {Cheerio} The instance itself, useful for chaining.
 * @see {@link https://api.jquery.com/each/}
 */
exports.each = function (fn) {
  var i = 0;
  var len = this.length;
  while (i < len && fn.call(this[i], i, this[i]) !== false) ++i;
  return this;
};

/**
 * Pass each element in the current matched set through a function, producing a
 * new Cheerio object containing the return values. The function can return an
 * individual data item or an array of data items to be inserted into the
 * resulting set. If an array is returned, the elements inside the array are
 * inserted into the set. If the function returns null or undefined, no element
 * will be inserted.
 *
 * @example
 *   $('li')
 *     .map(function (i, el) {
 *       // this === el
 *       return $(this).text();
 *     })
 *     .get()
 *     .join(' ');
 *   //=> "apple orange pear"
 *
 * @param {Function} fn - Function to execute.
 * @returns {Cheerio} The mapped elements, wrapped in a Cheerio collection.
 * @see {@link https://api.jquery.com/map/}
 */
exports.map = function (fn) {
  var elems = [];
  for (var i = 0; i < this.length; i++) {
    var el = this[i];
    var val = fn.call(el, i, el);
    if (val != null) {
      elems = elems.concat(val);
    }
  }
  return this._make(elems);
};

function getFilterFn(match) {
  if (typeof match === 'function') {
    return function (el, i) {
      return match.call(el, i, el);
    };
  }
  if (match.cheerio) {
    return match.is.bind(match);
  }
  return function (el) {
    return match === el;
  };
}

/**
 * Iterates over a cheerio object, reducing the set of selector elements to
 * those that match the selector or pass the function's test. When a Cheerio
 * selection is specified, return only the elements contained in that selection.
 * When an element is specified, return only that element (if it is contained in
 * the original selection). If using the function method, the function is
 * executed in the context of the selected element, so `this` refers to the
 * current element.
 *
 * @example <caption>Selector</caption>
 *   $('li').filter('.orange').attr('class');
 *   //=> orange
 *
 * @example <caption>Function</caption>
 *   $('li')
 *     .filter(function (i, el) {
 *       // this === el
 *       return $(this).attr('class') === 'orange';
 *     })
 *     .attr('class');
 *   //=> orange
 *
 * @function
 * @param {string | Function} match - Value to look for, following the rules above.
 * @param {Cheerio} [container] - Optional node to filter instead.
 * @returns {Cheerio} The filtered collection.
 * @see {@link https://api.jquery.com/filter/}
 */
exports.filter = function (match, container) {
  container = container || this;
  var elements = this.toArray ? this.toArray() : this;

  elements =
    typeof match === 'string'
      ? select.filter(match, elements, container.options)
      : elements.filter(getFilterFn(match));

  return container._make(elements);
};

/**
 * Remove elements from the set of matched elements. Given a jQuery object that
 * represents a set of DOM elements, the `.not()` method constructs a new jQuery
 * object from a subset of the matching elements. The supplied selector is
 * tested against each element; the elements that don't match the selector will
 * be included in the result. The `.not()` method can take a function as its
 * argument in the same way that `.filter()` does. Elements for which the
 * function returns true are excluded from the filtered set; all other elements
 * are included.
 *
 * @example <caption>Selector</caption>
 *   $('li').not('.apple').length;
 *   //=> 2
 *
 * @example <caption>Function</caption>
 *   $('li').not(function (i, el) {
 *     // this === el
 *     return $(this).attr('class') === 'orange';
 *   }).length;
 *   //=> 2
 *
 * @function
 * @param {string | Function} match - Value to look for, following the rules above.
 * @param {Node[] | Cheerio} [container] - Optional node to filter instead.
 * @returns {Cheerio} The filtered collection.
 * @see {@link https://api.jquery.com/not/}
 */
exports.not = function (match, container) {
  container = container || this;
  var elements = container.toArray ? container.toArray() : container;

  if (typeof match === 'string') {
    var matches = new Set(select.filter(match, elements, this.options));
    elements = elements.filter(function (el) {
      return !matches.has(el);
    });
  } else {
    var filterFn = getFilterFn(match);
    elements = elements.filter(function (el, i) {
      return !filterFn(el, i);
    });
  }

  return container._make(elements);
};

/**
 * Filters the set of matched elements to only those which have the given DOM
 * element as a descendant or which have a descendant that matches the given
 * selector. Equivalent to `.filter(':has(selector)')`.
 *
 * @example <caption>Selector</caption>
 *   $('ul').has('.pear').attr('id');
 *   //=> fruits
 *
 * @example <caption>Element</caption>
 *   $('ul').has($('.pear')[0]).attr('id');
 *   //=> fruits
 *
 * @param {string | Cheerio | Node} selectorOrHaystack - Element to look for.
 * @returns {Cheerio} The filtered collection.
 * @see {@link https://api.jquery.com/has/}
 */
exports.has = function (selectorOrHaystack) {
  var that = this;
  return exports.filter.call(this, function (_, el) {
    return that._make(el).find(selectorOrHaystack).length > 0;
  });
};

/**
 * Will select the first element of a cheerio object.
 *
 * @example
 *   $('#fruits').children().first().text();
 *   //=> Apple
 *
 * @returns {Cheerio} The first element.
 * @see {@link https://api.jquery.com/first/}
 */
exports.first = function () {
  return this.length > 1 ? this._make(this[0]) : this;
};

/**
 * Will select the last element of a cheerio object.
 *
 * @example
 *   $('#fruits').children().last().text();
 *   //=> Pear
 *
 * @returns {Cheerio} The last element.
 * @see {@link https://api.jquery.com/last/}
 */
exports.last = function () {
  return this.length > 1 ? this._make(this[this.length - 1]) : this;
};

/**
 * Reduce the set of matched elements to the one at the specified index. Use
 * `.eq(-i)` to count backwards from the last selected element.
 *
 * @example
 *   $('li').eq(0).text();
 *   //=> Apple
 *
 *   $('li').eq(-1).text();
 *   //=> Pear
 *
 * @param {number} i - Index of the element to select.
 * @returns {Cheerio} The element at the `i`th position.
 * @see {@link https://api.jquery.com/eq/}
 */
exports.eq = function (i) {
  i = +i;

  // Use the first identity optimization if possible
  if (i === 0 && this.length <= 1) return this;

  if (i < 0) i = this.length + i;
  return this[i] ? this._make(this[i]) : this._make([]);
};

/**
 * Retrieve the DOM elements matched by the Cheerio object. If an index is
 * specified, retrieve one of the elements matched by the Cheerio object.
 *
 * @example
 *   $('li').get(0).tagName
 *   //=> li
 *
 *   If no index is specified, retrieve all elements matched by the Cheerio object:
 *
 * @example
 *   $('li').get().length;
 *   //=> 3
 *
 * @param {number} [i] - Element to retrieve.
 * @returns {Node} The node at the `i`th position.
 * @see {@link https://api.jquery.com/get/}
 */
exports.get = function (i) {
  if (i == null) {
    return slice.call(this);
  }
  return this[i < 0 ? this.length + i : i];
};

/**
 * Search for a given element from among the matched elements.
 *
 * @example
 *   $('.pear').index();
 *   //=> 2
 *   $('.orange').index('li');
 *   //=> 1
 *   $('.apple').index($('#fruit, li'));
 *   //=> 1
 *
 * @param {string | Cheerio | Node} [selectorOrNeedle] - Element to look for.
 * @returns {number} The index of the element.
 * @see {@link https://api.jquery.com/index/}
 */
exports.index = function (selectorOrNeedle) {
  var $haystack;
  var needle;

  if (arguments.length === 0) {
    $haystack = this.parent().children();
    needle = this[0];
  } else if (typeof selectorOrNeedle === 'string') {
    $haystack = this._make(selectorOrNeedle);
    needle = this[0];
  } else {
    $haystack = this;
    needle = selectorOrNeedle.cheerio ? selectorOrNeedle[0] : selectorOrNeedle;
  }

  return $haystack.get().indexOf(needle);
};

/**
 * Gets the elements matching the specified range (0-based position).
 *
 * @example
 *   $('li').slice(1).eq(0).text();
 *   //=> 'Orange'
 *
 *   $('li').slice(1, 2).length;
 *   //=> 1
 *
 * @param {number} [start] - An position at which the elements begin to be
 *   selected. If negative, it indicates an offset from the end of the set.
 * @param {number} [end] - An position at which the elements stop being
 *   selected. If negative, it indicates an offset from the end of the set. If
 *   omitted, the range continues until the end of the set.
 * @returns {Cheerio} The elements matching the specified range.
 * @see {@link https://api.jquery.com/slice/}
 */
exports.slice = function (start, end) {
  return this._make(slice.call(this, start, end));
};

function traverseParents(self, elem, selector, limit) {
  var elems = [];
  while (elem && elems.length < limit && elem.type !== 'root') {
    if (!selector || exports.filter.call([elem], selector, self).length) {
      elems.push(elem);
    }
    elem = elem.parent;
  }
  return elems;
}

/**
 * End the most recent filtering operation in the current chain and return the
 * set of matched elements to its previous state.
 *
 * @example
 *   $('li').eq(0).end().length;
 *   //=> 3
 *
 * @returns {Cheerio} The previous state of the set of matched elements.
 * @see {@link https://api.jquery.com/end/}
 */
exports.end = function () {
  return this.prevObject || this._make([]);
};

/**
 * Add elements to the set of matched elements.
 *
 * @example
 *   $('.apple').add('.orange').length;
 *   //=> 2
 *
 * @param {string | Cheerio} other - Elements to add.
 * @param {Cheerio} [context] - Optionally the context of the new selection.
 * @returns {Cheerio} The combined set.
 * @see {@link https://api.jquery.com/add/}
 */
exports.add = function (other, context) {
  var selection = this._make(other, context);
  var contents = uniqueSort(this.get().concat(selection.get()));
  return this._make(contents);
};

/**
 * Add the previous set of elements on the stack to the current set, optionally
 * filtered by a selector.
 *
 * @example
 *   $('li').eq(0).addBack('.orange').length;
 *   //=> 2
 *
 * @param {string} selector - Selector for the elements to add.
 * @returns {Cheerio} The combined set.
 * @see {@link https://api.jquery.com/addBack/}
 */
exports.addBack = function (selector) {
  return this.add(
    arguments.length ? this.prevObject.filter(selector) : this.prevObject
  );
};
