'use strict';

const UrlValueParser = require('url-value-parser');
const url = require('url');

// ATTENTION! urlValueParser is a singleton!
let urlValueParser;

module.exports = function(req, opts) {
  // originalUrl is taken, because url and path can be changed
  // by middlewares such as 'router'. Note: this function is called onFinish
  /// i.e. always in the tail of the middleware chain
  let path = url.parse(req.originalUrl || req.url).pathname;
  const urlPathReplacement = opts ? opts.urlPathReplacement : '#val';

  const normalizePath = opts && opts.normalizePath;
  if (Array.isArray(normalizePath)) {
    for (const tuple of normalizePath) {
      if (!Array.isArray(tuple) || tuple.length !== 2) {
        throw new Error('Bad tuple provided in normalizePath option, expected: [regex, replacement]');
      }
      const regex = typeof tuple[0] === 'string' ? RegExp(tuple[0]) : tuple[0];
      path = path.replace(regex, tuple[1]);
    }
  }

  if (!urlValueParser) {
    urlValueParser = new UrlValueParser(opts && opts.urlValueParser);
  }
  return urlValueParser.replacePathValues(path, urlPathReplacement);
};
