'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var object = require('./object-c0c9435b.cjs');
require('./equality.cjs');

/**
 * Utility module to work with urls.
 *
 * @module url
 */

/**
 * Parse query parameters from an url.
 *
 * @param {string} url
 * @return {Object<string,string>}
 */
const decodeQueryParams = url => {
  /**
   * @type {Object<string,string>}
   */
  const query = {};
  const urlQuerySplit = url.split('?');
  const pairs = urlQuerySplit[urlQuerySplit.length - 1].split('&');
  for (let i = 0; i < pairs.length; i++) {
    const item = pairs[i];
    if (item.length > 0) {
      const pair = item.split('=');
      query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
  }
  return query
};

/**
 * @param {Object<string,string>} params
 * @return {string}
 */
const encodeQueryParams = params =>
  object.map(params, (val, key) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`).join('&');

exports.decodeQueryParams = decodeQueryParams;
exports.encodeQueryParams = encodeQueryParams;
//# sourceMappingURL=url.cjs.map
