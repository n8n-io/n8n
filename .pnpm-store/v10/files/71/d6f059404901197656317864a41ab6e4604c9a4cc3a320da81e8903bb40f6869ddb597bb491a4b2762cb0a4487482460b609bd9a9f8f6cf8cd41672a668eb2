'use strict';
/**
 * @module cheerio/static
 * @ignore
 */
var defaultOptions = require('./options').default;
var flattenOptions = require('./options').flatten;
var select = require('cheerio-select').select;
var renderWithParse5 = require('./parsers/parse5').render;
var renderWithHtmlparser2 = require('./parsers/htmlparser2').render;

/**
 * Helper function to render a DOM.
 *
 * @param {Cheerio} that - Cheerio instance to render.
 * @param {Node[] | undefined} dom - The DOM to render. Defaults to `that`'s root.
 * @param {object} options - Options for rendering.
 * @returns {string} The rendered document.
 */
function render(that, dom, options) {
  if (!dom) {
    if (that._root && that._root.children) {
      dom = that._root.children;
    } else {
      return '';
    }
  } else if (typeof dom === 'string') {
    dom = select(dom, that._root, options);
  }

  return options.xmlMode || options._useHtmlParser2
    ? renderWithHtmlparser2(dom, options)
    : renderWithParse5(dom);
}

/**
 * Renders the document.
 *
 * @param {string | Cheerio | Node | object} [dom] - Element to render.
 * @param {object} [options] - Options for the renderer.
 * @returns {string} The rendered document.
 */
exports.html = function (dom, options) {
  // be flexible about parameters, sometimes we call html(),
  // with options as only parameter
  // check dom argument for dom element specific properties
  // assume there is no 'length' or 'type' properties in the options object
  if (
    Object.prototype.toString.call(dom) === '[object Object]' &&
    !options &&
    !('length' in dom) &&
    !('type' in dom)
  ) {
    options = dom;
    dom = undefined;
  }

  // Sometimes `$.html()` is used without preloading html,
  // so fallback non-existing options to the default ones.
  options = Object.assign(
    {},
    defaultOptions,
    this ? this._options : {},
    flattenOptions(options || {})
  );

  return render(this, dom, options);
};

/**
 * Render the document as XML.
 *
 * @param {string | Cheerio | Node} [dom] - Element to render.
 * @returns {string} THe rendered document.
 */
exports.xml = function (dom) {
  var options = Object.assign({}, this._options, { xmlMode: true });

  return render(this, dom, options);
};

/**
 * Render the document as text.
 *
 * @param {Cheerio | Node[]} [elems] - Elements to render.
 * @returns {string} The rendered document.
 */
exports.text = function (elems) {
  if (!elems) {
    elems = this.root();
  }

  var ret = '';
  var len = elems.length;

  for (var i = 0; i < len; i++) {
    var elem = elems[i];
    if (elem.type === 'text') ret += elem.data;
    else if (
      elem.children &&
      elem.type !== 'comment' &&
      elem.tagName !== 'script' &&
      elem.tagName !== 'style'
    ) {
      ret += exports.text(elem.children);
    }
  }

  return ret;
};

/**
 * Parses a string into an array of DOM nodes. The `context` argument has no
 * meaning for Cheerio, but it is maintained for API compatibility with jQuery.
 *
 * @param {string} data - Markup that will be parsed.
 * @param {any | boolean} [context] - Will be ignored. If it is a boolean it
 *   will be used as the value of `keepScripts`.
 * @param {boolean} [keepScripts] - If false all scripts will be removed.
 * @returns {Node[]} The parsed DOM.
 * @alias Cheerio.parseHTML
 * @see {@link https://api.jquery.com/jQuery.parseHTML/}
 */
exports.parseHTML = function (data, context, keepScripts) {
  if (!data || typeof data !== 'string') {
    return null;
  }

  if (typeof context === 'boolean') {
    keepScripts = context;
  }

  var parsed = this.load(data, defaultOptions, false);
  if (!keepScripts) {
    parsed('script').remove();
  }

  // The `children` array is used by Cheerio internally to group elements that
  // share the same parents. When nodes created through `parseHTML` are
  // inserted into previously-existing DOM structures, they will be removed
  // from the `children` array. The results of `parseHTML` should remain
  // constant across these operations, so a shallow copy should be returned.
  return parsed.root()[0].children.slice();
};

/**
 * Sometimes you need to work with the top-level root element. To query it, you
 * can use `$.root()`.
 *
 * @example
 *   $.root().append('<ul id="vegetables"></ul>').html();
 *   //=> <ul id="fruits">...</ul><ul id="vegetables"></ul>
 *
 * @returns {Cheerio} Cheerio instance wrapping the root node.
 * @alias Cheerio.root
 */
exports.root = function () {
  return this(this._root);
};

/**
 * Checks to see if the `contained` DOM element is a descendant of the
 * `container` DOM element.
 *
 * @param {Node} container - Potential parent node.
 * @param {Node} contained - Potential child node.
 * @returns {boolean} Indicates if the nodes contain one another.
 * @alias Cheerio.contains
 * @see {@link https://api.jquery.com/jQuery.contains/}
 */
exports.contains = function (container, contained) {
  // According to the jQuery API, an element does not "contain" itself
  if (contained === container) {
    return false;
  }

  // Step up the descendants, stopping when the root element is reached
  // (signaled by `.parent` returning a reference to the same object)
  while (contained && contained !== contained.parent) {
    contained = contained.parent;
    if (contained === container) {
      return true;
    }
  }

  return false;
};

/**
 * $.merge().
 *
 * @param {Array | Cheerio} arr1 - First array.
 * @param {Array | Cheerio} arr2 - Second array.
 * @returns {Array | Cheerio} `arr1`, with elements of `arr2` inserted.
 * @alias Cheerio.merge
 * @see {@link https://api.jquery.com/jQuery.merge/}
 */
exports.merge = function (arr1, arr2) {
  if (!isArrayLike(arr1) || !isArrayLike(arr2)) {
    return;
  }
  var newLength = arr1.length;
  var len = +arr2.length;

  for (var i = 0; i < len; i++) {
    arr1[newLength++] = arr2[i];
  }
  arr1.length = newLength;
  return arr1;
};

/**
 * @param {any} item - Item to check.
 * @returns {boolean} Indicates if the item is array-like.
 */
function isArrayLike(item) {
  if (Array.isArray(item)) {
    return true;
  }

  if (
    typeof item !== 'object' ||
    !Object.prototype.hasOwnProperty.call(item, 'length') ||
    typeof item.length !== 'number' ||
    item.length < 0
  ) {
    return false;
  }

  for (var i = 0; i < item.length; i++) {
    if (!(i in item)) {
      return false;
    }
  }
  return true;
}
