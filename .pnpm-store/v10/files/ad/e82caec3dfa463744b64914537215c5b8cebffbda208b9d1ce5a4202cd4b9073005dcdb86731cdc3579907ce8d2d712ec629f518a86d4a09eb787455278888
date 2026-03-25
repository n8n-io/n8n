'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var querystringEs3 = require('querystring-es3');

/**
 * @typedef {import('querystring').escape} qsEscape
 * @typedef {import('querystring').unescape} qsUnescape
 */

/**
 * @type {qsEscape}
 */
function qsEscape(string) {
  return encodeURIComponent(string);
}

/**
 * @type {qsUnescape}
 */
function qsUnescape(string) {
  return decodeURIComponent(string);
}
var api = {
  decode: querystringEs3.decode,
  encode: querystringEs3.encode,
  parse: querystringEs3.parse,
  stringify: querystringEs3.stringify,
  escape: qsEscape,
  unescape: qsUnescape
};

Object.defineProperty(exports, 'decode', {
	enumerable: true,
	get: function () { return querystringEs3.decode; }
});
Object.defineProperty(exports, 'encode', {
	enumerable: true,
	get: function () { return querystringEs3.encode; }
});
Object.defineProperty(exports, 'parse', {
	enumerable: true,
	get: function () { return querystringEs3.parse; }
});
Object.defineProperty(exports, 'stringify', {
	enumerable: true,
	get: function () { return querystringEs3.stringify; }
});
exports["default"] = api;
exports.escape = qsEscape;
exports.unescape = qsUnescape;

exports = module.exports = api;
//# sourceMappingURL=querystring.js.map
