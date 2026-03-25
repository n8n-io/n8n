/* eslint no-undefined: 0 */
'use strict';

var format = require('./format');
var _require = require('triple-beam'),
  MESSAGE = _require.MESSAGE;
var jsonStringify = require('safe-stable-stringify');

/*
 * function simple (info)
 * Returns a new instance of the simple format TransformStream
 * which writes a simple representation of logs.
 *
 *    const { level, message, splat, ...rest } = info;
 *
 *    ${level}: ${message}                            if rest is empty
 *    ${level}: ${message} ${JSON.stringify(rest)}    otherwise
 */
module.exports = format(function (info) {
  var stringifiedRest = jsonStringify(Object.assign({}, info, {
    level: undefined,
    message: undefined,
    splat: undefined
  }));
  var padding = info.padding && info.padding[info.level] || '';
  if (stringifiedRest !== '{}') {
    info[MESSAGE] = "".concat(info.level, ":").concat(padding, " ").concat(info.message, " ").concat(stringifiedRest);
  } else {
    info[MESSAGE] = "".concat(info.level, ":").concat(padding, " ").concat(info.message);
  }
  return info;
});