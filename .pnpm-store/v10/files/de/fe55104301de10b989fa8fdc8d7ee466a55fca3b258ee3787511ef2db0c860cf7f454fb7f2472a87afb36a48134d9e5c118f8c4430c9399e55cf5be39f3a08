import { decode, encode, parse, stringify } from 'querystring-es3';
export { decode, encode, parse, stringify } from 'querystring-es3';

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
  decode: decode,
  encode: encode,
  parse: parse,
  stringify: stringify,
  escape: qsEscape,
  unescape: qsUnescape
};

export { api as default, qsEscape as escape, qsUnescape as unescape };
//# sourceMappingURL=querystring.js.map
