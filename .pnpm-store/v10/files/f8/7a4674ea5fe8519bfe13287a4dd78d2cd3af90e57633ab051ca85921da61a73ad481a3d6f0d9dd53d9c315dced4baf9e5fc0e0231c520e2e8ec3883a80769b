'use strict';
/*
  Module dependencies
*/

var parse = require('./parse');
var defaultOptions = require('./options').default;
var flattenOptions = require('./options').flatten;
var isHtml = require('./utils').isHtml;

/*
 * The API
 */
var api = [
  require('./api/attributes'),
  require('./api/traversing'),
  require('./api/manipulation'),
  require('./api/css'),
  require('./api/forms'),
];

/**
 * Instance of cheerio. Methods are specified in the modules. Usage of this
 * constructor is not recommended. Please use $.load instead.
 *
 * @class
 * @param {string | Cheerio | Node | Node[]} selector - The new selection.
 * @param {string | Cheerio | Node | Node[]} [context] - Context of the selection.
 * @param {string | Cheerio | Node | Node[]} [root] - Sets the root node.
 * @param {object} [options] - Options for the instance.
 * @hideconstructor
 * @mixes module:cheerio/attributes
 * @mixes module:cheerio/css
 * @mixes module:cheerio/forms
 * @mixes module:cheerio/manipulation
 * @mixes module:cheerio/traversing
 */
var Cheerio = (module.exports = function (selector, context, root, options) {
  if (!(this instanceof Cheerio)) {
    return new Cheerio(selector, context, root, options);
  }

  this.length = 0;
  this.options = Object.assign(
    {},
    defaultOptions,
    this.options,
    flattenOptions(options)
  );

  // $(), $(null), $(undefined), $(false)
  if (!selector) return this;

  if (root) {
    if (typeof root === 'string') root = parse(root, this.options, false);
    this._root = Cheerio.call(this, root);
  }

  // $(<html>)
  if (typeof selector === 'string' && isHtml(selector)) {
    selector = parse(selector, this.options, false).children;
  }

  // $($)
  if (selector.cheerio) return selector;

  // $(dom)
  if (isNode(selector)) selector = [selector];

  // $([dom])
  if (Array.isArray(selector)) {
    selector.forEach(function (elem, idx) {
      this[idx] = elem;
    }, this);
    this.length = selector.length;
    return this;
  }

  // If we don't have a context, maybe we have a root, from loading
  if (!context) {
    context = this._root;
  } else if (typeof context === 'string') {
    if (isHtml(context)) {
      // $('li', '<ul>...</ul>')
      context = parse(context, this.options, false);
      context = Cheerio.call(this, context);
    } else {
      // $('li', 'ul')
      selector = context + ' ' + selector;
      context = this._root;
    }
  } else if (!context.cheerio) {
    // $('li', node), $('li', [nodes])
    context = Cheerio.call(this, context);
  }

  // If we still don't have a context, return
  if (!context) return this;

  // #id, .class, tag
  return context.find(selector);
});

/** Set a signature of the object. */
Cheerio.prototype.cheerio = '[cheerio object]';

/*
 * Make cheerio an array-like object
 */
Cheerio.prototype.splice = Array.prototype.splice;

/**
 * Make a cheerio object.
 *
 * @private
 * @param {Node[]} dom - The contents of the new object.
 * @param {Node[]} [context] - The context of the new object.
 * @returns {Cheerio} The new cheerio object.
 */
Cheerio.prototype._make = function (dom, context) {
  var cheerio = new this.constructor(dom, context, this._root, this.options);
  cheerio.prevObject = this;
  return cheerio;
};

/**
 * Retrieve all the DOM elements contained in the jQuery set as an array.
 *
 * @example
 *   $('li').toArray(); //=> [ {...}, {...}, {...} ]
 *
 * @returns {Node[]} The contained items.
 */
Cheerio.prototype.toArray = function () {
  return this.get();
};

// Support for (const element of $(...)) iteration:
Cheerio.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];

// Plug in the API
api.forEach(function (mod) {
  Object.assign(Cheerio.prototype, mod);
});

function isNode(obj) {
  return (
    obj.name ||
    obj.type === 'root' ||
    obj.type === 'text' ||
    obj.type === 'comment'
  );
}
