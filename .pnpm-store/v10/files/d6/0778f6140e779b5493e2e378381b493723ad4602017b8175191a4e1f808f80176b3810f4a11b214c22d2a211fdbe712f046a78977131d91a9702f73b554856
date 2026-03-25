/**
 * common.js: Internal helper and utility functions for winston.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

var _require = require('util'),
  format = _require.format;

/**
 * Set of simple deprecation notices and a way to expose them for a set of
 * properties.
 * @type {Object}
 * @private
 */
exports.warn = {
  deprecated: function deprecated(prop) {
    return function () {
      throw new Error(format('{ %s } was removed in winston@3.0.0.', prop));
    };
  },
  useFormat: function useFormat(prop) {
    return function () {
      throw new Error([format('{ %s } was removed in winston@3.0.0.', prop), 'Use a custom winston.format = winston.format(function) instead.'].join('\n'));
    };
  },
  forFunctions: function forFunctions(obj, type, props) {
    props.forEach(function (prop) {
      obj[prop] = exports.warn[type](prop);
    });
  },
  forProperties: function forProperties(obj, type, props) {
    props.forEach(function (prop) {
      var notice = exports.warn[type](prop);
      Object.defineProperty(obj, prop, {
        get: notice,
        set: notice
      });
    });
  }
};