'use strict';
/**
 * Methods for modifying the DOM structure.
 *
 * @module cheerio/manipulation
 */

var parse = require('../parse');
var html = require('../static').html;
var text = require('../static').text;
var updateDOM = parse.update;
var utils = require('../utils');
var domEach = utils.domEach;
var cloneDom = utils.cloneDom;
var isHtml = utils.isHtml;
var slice = Array.prototype.slice;
var domhandler = require('domhandler');
var DomUtils = require('htmlparser2').DomUtils;

/**
 * Create an array of nodes, recursing into arrays and parsing strings if necessary.
 *
 * @private
 * @param {Cheerio | string | Cheerio[] | string[]} [elem] - Elements to make an array of.
 * @param {boolean} [clone] - Optionally clone nodes.
 * @returns {Node[]} The array of nodes.
 */
exports._makeDomArray = function makeDomArray(elem, clone) {
  if (elem == null) {
    return [];
  }
  if (elem.cheerio) {
    return clone ? cloneDom(elem.get()) : elem.get();
  }
  if (Array.isArray(elem)) {
    return elem.reduce(
      function (newElems, el) {
        return newElems.concat(this._makeDomArray(el, clone));
      }.bind(this),
      []
    );
  }
  if (typeof elem === 'string') {
    return parse(elem, this.options, false).children;
  }
  return clone ? cloneDom([elem]) : [elem];
};

function _insert(concatenator) {
  return function () {
    var elems = slice.call(arguments);
    var lastIdx = this.length - 1;

    return domEach(this, function (i, el) {
      var domSrc =
        typeof elems[0] === 'function'
          ? elems[0].call(el, i, html(el.children))
          : elems;

      var dom = this._makeDomArray(domSrc, i < lastIdx);
      concatenator(dom, el.children, el);
    });
  };
}

/**
 * Modify an array in-place, removing some number of elements and adding new
 * elements directly following them.
 *
 * @private
 * @param {Node[]} array - Target array to splice.
 * @param {number} spliceIdx - Index at which to begin changing the array.
 * @param {number} spliceCount - Number of elements to remove from the array.
 * @param {Node[]} newElems - Elements to insert into the array.
 * @param {NodeWithChildren} parent - The parent of the node.
 * @returns {Node[]} The spliced array.
 */
function uniqueSplice(array, spliceIdx, spliceCount, newElems, parent) {
  var spliceArgs = [spliceIdx, spliceCount].concat(newElems);
  var prev = array[spliceIdx - 1] || null;
  var next = array[spliceIdx + spliceCount] || null;

  // Before splicing in new elements, ensure they do not already appear in the
  // current array.
  for (var idx = 0; idx < newElems.length; ++idx) {
    var node = newElems[idx];
    var oldParent = node.parent;
    var prevIdx = oldParent && oldParent.children.indexOf(newElems[idx]);

    if (oldParent && prevIdx > -1) {
      oldParent.children.splice(prevIdx, 1);
      if (parent === oldParent && spliceIdx > prevIdx) {
        spliceArgs[0]--;
      }
    }

    node.parent = parent;

    if (node.prev) {
      node.prev.next = node.next || null;
    }

    if (node.next) {
      node.next.prev = node.prev || null;
    }

    node.prev = newElems[idx - 1] || prev;
    node.next = newElems[idx + 1] || next;
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
 * @example
 *   $('<li class="plum">Plum</li>').appendTo('#fruits');
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="apple">Apple</li>
 *   //      <li class="orange">Orange</li>
 *   //      <li class="pear">Pear</li>
 *   //      <li class="plum">Plum</li>
 *   //    </ul>
 *
 * @param {string | Cheerio} target - Element to append elements to.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/appendTo/}
 */
exports.appendTo = function (target) {
  if (!target.cheerio) {
    target = this.constructor.call(
      this.constructor,
      target,
      null,
      this._originalRoot
    );
  }

  target.append(this);

  return this;
};

/**
 * Insert every element in the set of matched elements to the beginning of the target.
 *
 * @example
 *   $('<li class="plum">Plum</li>').prependTo('#fruits');
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="plum">Plum</li>
 *   //      <li class="apple">Apple</li>
 *   //      <li class="orange">Orange</li>
 *   //      <li class="pear">Pear</li>
 *   //    </ul>
 *
 * @param {string | Cheerio} target - Element to prepend elements to.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/prependTo/}
 */
exports.prependTo = function (target) {
  if (!target.cheerio) {
    target = this.constructor.call(
      this.constructor,
      target,
      null,
      this._originalRoot
    );
  }

  target.prepend(this);

  return this;
};

/**
 * Inserts content as the *last* child of each of the selected elements.
 *
 * @example
 *   $('ul').append('<li class="plum">Plum</li>');
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="apple">Apple</li>
 *   //      <li class="orange">Orange</li>
 *   //      <li class="pear">Pear</li>
 *   //      <li class="plum">Plum</li>
 *   //    </ul>
 *
 * @function
 * @see {@link https://api.jquery.com/append/}
 */
exports.append = _insert(function (dom, children, parent) {
  uniqueSplice(children, children.length, 0, dom, parent);
});

/**
 * Inserts content as the *first* child of each of the selected elements.
 *
 * @example
 *   $('ul').prepend('<li class="plum">Plum</li>');
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="plum">Plum</li>
 *   //      <li class="apple">Apple</li>
 *   //      <li class="orange">Orange</li>
 *   //      <li class="pear">Pear</li>
 *   //    </ul>
 *
 * @function
 * @see {@link https://api.jquery.com/prepend/}
 */
exports.prepend = _insert(function (dom, children, parent) {
  uniqueSplice(children, 0, 0, dom, parent);
});

function _wrap(insert) {
  return function (wrapper) {
    var wrapperFn = typeof wrapper === 'function' && wrapper;
    var lastIdx = this.length - 1;
    var lastParent = this.parents().last();

    for (var i = 0; i < this.length; i++) {
      var el = this[i];

      if (wrapperFn) {
        wrapper = wrapperFn.call(el, i);
      }

      if (typeof wrapper === 'string' && !isHtml(wrapper)) {
        wrapper = lastParent.find(wrapper).clone();
      }

      var wrapperDom = this._makeDomArray(wrapper, i < lastIdx).slice(0, 1);
      var elInsertLocation = wrapperDom[0];
      // Find the deepest child. Only consider the first tag child of each node
      // (ignore text); stop if no children are found.
      var j = 0;

      while (
        elInsertLocation &&
        elInsertLocation.children &&
        j < elInsertLocation.children.length
      ) {
        if (elInsertLocation.children[j].type === 'tag') {
          elInsertLocation = elInsertLocation.children[j];
          j = 0;
        } else {
          j++;
        }
      }

      insert(el, elInsertLocation, wrapperDom);
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
 * @example
 *   const redFruit = $('<div class="red-fruit"></div>');
 *   $('.apple').wrap(redFruit);
 *
 *   //=> <ul id="fruits">
 *   //     <div class="red-fruit">
 *   //      <li class="apple">Apple</li>
 *   //     </div>
 *   //     <li class="orange">Orange</li>
 *   //     <li class="plum">Plum</li>
 *   //   </ul>
 *
 *   const healthy = $('<div class="healthy"></div>');
 *   $('li').wrap(healthy);
 *
 *   //=> <ul id="fruits">
 *   //     <div class="healthy">
 *   //       <li class="apple">Apple</li>
 *   //     </div>
 *   //     <div class="healthy">
 *   //       <li class="orange">Orange</li>
 *   //     </div>
 *   //     <div class="healthy">
 *   //        <li class="plum">Plum</li>
 *   //     </div>
 *   //   </ul>
 *
 * @function
 * @param {Cheerio} wrapper - The DOM structure to wrap around each element in
 *   the selection.
 * @see {@link https://api.jquery.com/wrap/}
 */
exports.wrap = _wrap(function (el, elInsertLocation, wrapperDom) {
  var parent = el.parent;
  var siblings = parent.children;
  var index = siblings.indexOf(el);

  updateDOM([el], elInsertLocation);
  // The previous operation removed the current element from the `siblings`
  // array, so the `dom` array can be inserted without removing any
  // additional elements.
  uniqueSplice(siblings, index, 0, wrapperDom, parent);
});

/**
 * The .wrapInner() function can take any string or object that could be passed
 * to the $() factory function to specify a DOM structure. This structure may be
 * nested several levels deep, but should contain only one inmost element. The
 * structure will be wrapped around the content of each of the elements in the
 * set of matched elements.
 *
 * @example
 *   const redFruit = $('<div class="red-fruit"></div>');
 *   $('.apple').wrapInner(redFruit);
 *
 *   //=> <ul id="fruits">
 *   //     <li class="apple">
 *   //       <div class="red-fruit">Apple</div>
 *   //     </li>
 *   //     <li class="orange">Orange</li>
 *   //     <li class="pear">Pear</li>
 *   //   </ul>
 *
 *   const healthy = $('<div class="healthy"></div>');
 *   $('li').wrapInner(healthy);
 *
 *   //=> <ul id="fruits">
 *   //     <li class="apple">
 *   //       <div class="healthy">Apple</div>
 *   //     </li>
 *   //     <li class="orange">
 *   //       <div class="healthy">Orange</div>
 *   //     </li>
 *   //     <li class="pear">
 *   //       <div class="healthy">Pear</div>
 *   //     </li>
 *   //   </ul>
 *
 * @function
 * @param {Cheerio} wrapper - The DOM structure to wrap around the content of
 *   each element in the selection.
 * @see {@link https://api.jquery.com/wrapInner/}
 */
exports.wrapInner = _wrap(function (el, elInsertLocation, wrapperDom) {
  updateDOM(el.children, elInsertLocation);
  updateDOM(wrapperDom, el);
});

/**
 * The .unwrap() function, removes the parents of the set of matched elements
 * from the DOM, leaving the matched elements in their place.
 *
 * @example <caption>without selector</caption>
 *   const $ = cheerio.load(
 *     '<div id=test>\n  <div><p>Hello</p></div>\n  <div><p>World</p></div>\n</div>'
 *   );
 *   $('#test p').unwrap();
 *
 *   //=> <div id=test>
 *   //     <p>Hello</p>
 *   //     <p>World</p>
 *   //   </div>
 *
 * @example <caption>with selector</caption>
 *   const $ = cheerio.load(
 *     '<div id=test>\n  <p>Hello</p>\n  <b><p>World</p></b>\n</div>'
 *   );
 *   $('#test p').unwrap('b');
 *
 *   //=> <div id=test>
 *   //     <p>Hello</p>
 *   //     <p>World</p>
 *   //   </div>
 *
 * @param {string} [selector] - A selector to check the parent element against.
 *   If an element's parent does not match the selector, the element won't be unwrapped.
 * @returns {Cheerio} The instance itself, for chaining.
 * @see {@link https://api.jquery.com/unwrap/}
 */
exports.unwrap = function (selector) {
  var self = this;
  this.parent(selector)
    .not('body')
    .each(function (i, el) {
      self._make(el).replaceWith(el.children);
    });
  return this;
};

/**
 * The .wrapAll() function can take any string or object that could be passed to
 * the $() function to specify a DOM structure. This structure may be nested
 * several levels deep, but should contain only one inmost element. The
 * structure will be wrapped around all of the elements in the set of matched
 * elements, as a single group.
 *
 * @example <caption>With markup passed to `wrapAll`</caption>
 *   const $ = cheerio.load(
 *     '<div class="container"><div class="inner">First</div><div class="inner">Second</div></div>'
 *   );
 *   $('.inner').wrapAll("<div class='new'></div>");
 *
 *   //=> <div class="container">
 *   //     <div class='new'>
 *   //       <div class="inner">First</div>
 *   //       <div class="inner">Second</div>
 *   //     </div>
 *   //   </div>
 *
 * @example <caption>With an existing cheerio instance</caption>
 *   const $ = cheerio.load(
 *     '<span>Span 1</span><strong>Strong</strong><span>Span 2</span>'
 *   );
 *   const wrap = $('<div><p><em><b></b></em></p></div>');
 *   $('span').wrapAll(wrap);
 *
 *   //=> <div>
 *   //     <p>
 *   //       <em>
 *   //         <b>
 *   //           <span>Span 1</span>
 *   //           <span>Span 2</span>
 *   //         </b>
 *   //       </em>
 *   //     </p>
 *   //   </div>
 *   //   <strong>Strong</strong>
 *
 * @param {Cheerio | string | Element | Element[] | Function} wrapper - The DOM
 *   structure to wrap around all matched elements in the selection.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/wrapAll/}
 */
exports.wrapAll = function (wrapper) {
  if (this[0]) {
    if (typeof wrapper === 'function') {
      wrapper = wrapper.call(this[0]);
    }

    var wrap = this._make(wrapper).insertBefore(this[0]);

    // if html is given as wrapper, wrap may contain text elements
    var elInsertLocation = { children: wrap };
    var j = 0;

    // Find the deepest child. Only consider the first tag child of each node
    // (ignore text); stop if no children are found.
    while (
      elInsertLocation &&
      elInsertLocation.children &&
      j < elInsertLocation.children.length
    ) {
      if (elInsertLocation.children[j].type === 'tag') {
        elInsertLocation = elInsertLocation.children[j];
        j = 0;
      } else {
        j++;
      }
    }

    this._make(elInsertLocation).append(this);
  }
  return this;
};

/*eslint-disable jsdoc/check-param-names*/

/**
 * Insert content next to each element in the set of matched elements.
 *
 * @example
 *   $('.apple').after('<li class="plum">Plum</li>');
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="apple">Apple</li>
 *   //      <li class="plum">Plum</li>
 *   //      <li class="orange">Orange</li>
 *   //      <li class="pear">Pear</li>
 *   //    </ul>
 *
 * @param {...(string | Element | Element[] | Cheerio | Function)} content -
 *   HTML string, DOM element, array of DOM elements or Cheerio to insert after
 *   each element in the set of matched elements.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/after/}
 */
exports.after = function () {
  var elems = slice.call(arguments);
  var lastIdx = this.length - 1;

  return domEach(this, function (i, el) {
    var parent = el.parent;
    if (!parent) {
      return;
    }

    var siblings = parent.children;
    var index = siblings.indexOf(el);

    // If not found, move on
    /* istanbul ignore next */
    if (index < 0) return;

    var domSrc =
      typeof elems[0] === 'function'
        ? elems[0].call(el, i, html(el.children))
        : elems;

    var dom = this._makeDomArray(domSrc, i < lastIdx);

    // Add element after `this` element
    uniqueSplice(siblings, index + 1, 0, dom, parent);
  });
};

/*eslint-enable jsdoc/check-param-names*/

/**
 * Insert every element in the set of matched elements after the target.
 *
 * @example
 *   $('<li class="plum">Plum</li>').insertAfter('.apple');
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="apple">Apple</li>
 *   //      <li class="plum">Plum</li>
 *   //      <li class="orange">Orange</li>
 *   //      <li class="pear">Pear</li>
 *   //    </ul>
 *
 * @param {string | Cheerio} target - Element to insert elements after.
 * @returns {Cheerio} The set of newly inserted elements.
 * @see {@link https://api.jquery.com/insertAfter/}
 */
exports.insertAfter = function (target) {
  var clones = [];
  var self = this;
  if (typeof target === 'string') {
    target = this.constructor.call(
      this.constructor,
      target,
      null,
      this._originalRoot
    );
  }
  target = this._makeDomArray(target);
  self.remove();
  domEach(target, function (i, el) {
    var clonedSelf = self._makeDomArray(self.clone());
    var parent = el.parent;
    if (!parent) {
      return;
    }

    var siblings = parent.children;
    var index = siblings.indexOf(el);

    // If not found, move on
    /* istanbul ignore next */
    if (index < 0) return;

    // Add cloned `this` element(s) after target element
    uniqueSplice(siblings, index + 1, 0, clonedSelf, parent);
    clones.push(clonedSelf);
  });
  return this.constructor.call(this.constructor, this._makeDomArray(clones));
};

/*eslint-disable jsdoc/check-param-names*/

/**
 * Insert content previous to each element in the set of matched elements.
 *
 * @example
 *   $('.apple').before('<li class="plum">Plum</li>');
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="plum">Plum</li>
 *   //      <li class="apple">Apple</li>
 *   //      <li class="orange">Orange</li>
 *   //      <li class="pear">Pear</li>
 *   //    </ul>
 *
 * @param {...(string | Element | Element[] | Cheerio | Function)} content -
 *   HTML string, DOM element, array of DOM elements or Cheerio to insert before
 *   each element in the set of matched elements.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/before/}
 */
exports.before = function () {
  var elems = slice.call(arguments);
  var lastIdx = this.length - 1;

  return domEach(this, function (i, el) {
    var parent = el.parent;
    if (!parent) {
      return;
    }

    var siblings = parent.children;
    var index = siblings.indexOf(el);

    // If not found, move on
    /* istanbul ignore next */
    if (index < 0) return;

    var domSrc =
      typeof elems[0] === 'function'
        ? elems[0].call(el, i, html(el.children))
        : elems;

    var dom = this._makeDomArray(domSrc, i < lastIdx);

    // Add element before `el` element
    uniqueSplice(siblings, index, 0, dom, parent);
  });
};

/*eslint-enable jsdoc/check-param-names*/

/**
 * Insert every element in the set of matched elements before the target.
 *
 * @example
 *   $('<li class="plum">Plum</li>').insertBefore('.apple');
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="plum">Plum</li>
 *   //      <li class="apple">Apple</li>
 *   //      <li class="orange">Orange</li>
 *   //      <li class="pear">Pear</li>
 *   //    </ul>
 *
 * @param {string | Cheerio} target - Element to insert elements before.
 * @returns {Cheerio} The set of newly inserted elements.
 * @see {@link https://api.jquery.com/insertBefore/}
 */
exports.insertBefore = function (target) {
  var clones = [];
  var self = this;
  if (typeof target === 'string') {
    target = this.constructor.call(
      this.constructor,
      target,
      null,
      this._originalRoot
    );
  }
  target = this._makeDomArray(target);
  self.remove();
  domEach(target, function (_, el) {
    var clonedSelf = self._makeDomArray(self.clone());
    var parent = el.parent;
    if (!parent) {
      return;
    }

    var siblings = parent.children;
    var index = siblings.indexOf(el);

    // If not found, move on
    /* istanbul ignore next */
    if (index < 0) return;

    // Add cloned `this` element(s) after target element
    uniqueSplice(siblings, index, 0, clonedSelf, parent);
    clones.push(clonedSelf);
  });
  return this.constructor.call(this.constructor, this._makeDomArray(clones));
};

/**
 * Removes the set of matched elements from the DOM and all their children.
 * `selector` filters the set of matched elements to be removed.
 *
 * @example
 *   $('.pear').remove();
 *   $.html();
 *   //=>  <ul id="fruits">
 *   //      <li class="apple">Apple</li>
 *   //      <li class="orange">Orange</li>
 *   //    </ul>
 *
 * @param {string} [selector] - Optional selector for elements to remove.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/remove/}
 */
exports.remove = function (selector) {
  // Filter if we have selector
  var elems = selector ? this.filter(selector) : this;

  domEach(elems, function (_, el) {
    DomUtils.removeElement(el);
    el.prev = el.next = el.parent = null;
  });

  return this;
};

/**
 * Replaces matched elements with `content`.
 *
 * @example
 *   const plum = $('<li class="plum">Plum</li>');
 *   $('.pear').replaceWith(plum);
 *   $.html();
 *   //=> <ul id="fruits">
 *   //     <li class="apple">Apple</li>
 *   //     <li class="orange">Orange</li>
 *   //     <li class="plum">Plum</li>
 *   //   </ul>
 *
 * @param {Cheerio | Function} content - Replacement for matched elements.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/replaceWith/}
 */
exports.replaceWith = function (content) {
  return domEach(this, function (i, el) {
    var parent = el.parent;
    if (!parent) {
      return;
    }

    var siblings = parent.children;
    var dom = this._makeDomArray(
      typeof content === 'function' ? content.call(el, i, el) : content
    );

    // In the case that `dom` contains nodes that already exist in other
    // structures, ensure those nodes are properly removed.
    updateDOM(dom, null);

    var index = siblings.indexOf(el);

    // Completely remove old element
    uniqueSplice(siblings, index, 1, dom, parent);

    if (dom.indexOf(el) < 0) {
      el.parent = el.prev = el.next = null;
    }
  });
};

/**
 * Empties an element, removing all its children.
 *
 * @example
 *   $('ul').empty();
 *   $.html();
 *   //=>  <ul id="fruits"></ul>
 *
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/empty/}
 */
exports.empty = function () {
  return domEach(this, function (_, el) {
    el.children.forEach(function (child) {
      child.next = child.prev = child.parent = null;
    });

    el.children.length = 0;
  });
};

/**
 * Gets an HTML content string from the first selected element. If `htmlString`
 * is specified, each selected element's content is replaced by the new content.
 *
 * @example
 *   $('.orange').html();
 *   //=> Orange
 *
 *   $('#fruits').html('<li class="mango">Mango</li>').html();
 *   //=> <li class="mango">Mango</li>
 *
 * @param {string | Cheerio} str - If specified used to replace selection's contents.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/html/}
 */
exports.html = function (str) {
  if (str === undefined) {
    if (!this[0] || !this[0].children) return null;
    return html(this[0].children, this.options);
  }

  var opts = Object.apply({}, this.options); // keep main options

  return domEach(this, function (_, el) {
    el.children.forEach(function (child) {
      child.next = child.prev = child.parent = null;
    });

    opts.context = el;

    var content = str.cheerio
      ? str.clone().get()
      : parse('' + str, opts, false).children;

    updateDOM(content, el);
  });
};

/**
 * Turns the collection to a string. Alias for `.html()`.
 *
 * @returns {string} The rendered document.
 */
exports.toString = function () {
  return html(this, this.options);
};

/**
 * Get the combined text contents of each element in the set of matched
 * elements, including their descendants. If `textString` is specified, each
 * selected element's content is replaced by the new text content.
 *
 * @example
 *   $('.orange').text();
 *   //=> Orange
 *
 *   $('ul').text();
 *   //=>  Apple
 *   //    Orange
 *   //    Pear
 *
 * @param {string | Function} [str] - If specified replacement for the selected
 *   element's contents.
 * @returns {Cheerio | string} The instance itself when setting text, otherwise
 *   the rendered document.
 * @see {@link https://api.jquery.com/text/}
 */
exports.text = function (str) {
  // If `str` is undefined, act as a "getter"
  if (str === undefined) {
    return text(this);
  }
  if (typeof str === 'function') {
    // Function support
    return domEach(this, function (i, el) {
      return exports.text.call(this._make(el), str.call(el, i, text([el])));
    });
  }

  // Append text node to each selected elements
  return domEach(this, function (_, el) {
    el.children.forEach(function (child) {
      child.next = child.prev = child.parent = null;
    });

    var textNode = new domhandler.Text(str);

    updateDOM(textNode, el);
  });
};

/**
 * Clone the cheerio object.
 *
 * @example
 *   const moreFruit = $('#fruits').clone();
 *
 * @returns {Cheerio} The cloned object.
 * @see {@link https://api.jquery.com/clone/}
 */
exports.clone = function () {
  return this._make(cloneDom(this.get()));
};
