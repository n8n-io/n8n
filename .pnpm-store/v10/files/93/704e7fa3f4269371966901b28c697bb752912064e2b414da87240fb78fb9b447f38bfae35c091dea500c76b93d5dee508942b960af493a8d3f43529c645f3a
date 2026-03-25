'use strict';
/**
 * @module cheerio/load
 * @ignore
 */
var defaultOptions = require('./options').default;
var flattenOptions = require('./options').flatten;
var staticMethods = require('./static');
var Cheerio = require('./cheerio');
var parse = require('./parse');

/**
 * Create a querying function, bound to a document created from the provided
 * markup. Note that similar to web browser contexts, this operation may
 * introduce `<html>`, `<head>`, and `<body>` elements; set `isDocument` to
 * `false` to switch to fragment mode and disable this.
 *
 * See the README section titled "Loading" for additional usage information.
 *
 * @param {string} content - Markup to be loaded.
 * @param {object} [options] - Options for the created instance.
 * @param {boolean} [isDocument] - Allows parser to be switched to fragment mode.
 * @returns {Cheerio} - The loaded document.
 */
exports.load = function (content, options, isDocument) {
  if (content === null || content === undefined) {
    throw new Error('cheerio.load() expects a string');
  }

  options = Object.assign({}, defaultOptions, flattenOptions(options));

  if (typeof isDocument === 'undefined') isDocument = true;

  var root = parse(content, options, isDocument);

  function initialize(selector, context, r, opts) {
    if (!(this instanceof initialize)) {
      return new initialize(selector, context, r, opts);
    }
    opts = Object.assign({}, options, opts);
    return Cheerio.call(this, selector, context, r || root, opts);
  }

  // Ensure that selections created by the "loaded" `initialize` function are
  // true Cheerio instances.
  initialize.prototype = Object.create(Cheerio.prototype);
  initialize.prototype.constructor = initialize;

  // Mimic jQuery's prototype alias for plugin authors.
  initialize.fn = initialize.prototype;

  // Keep a reference to the top-level scope so we can chain methods that implicitly
  // resolve selectors; e.g. $("<span>").(".bar"), which otherwise loses ._root
  initialize.prototype._originalRoot = root;

  // Add in the static methods
  Object.assign(initialize, staticMethods, exports);

  // Add in the root
  initialize._root = root;
  // store options
  initialize._options = options;

  return initialize;
};
