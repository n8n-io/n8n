'use strict';

var colors = require('@colors/colors/safe');
var format = require('./format');
var _require = require('triple-beam'),
  MESSAGE = _require.MESSAGE;

/*
 * function uncolorize (info)
 * Returns a new instance of the uncolorize Format that strips colors
 * from `info` objects. This was previously exposed as { stripColors: true }
 * to transports in `winston < 3.0.0`.
 */
module.exports = format(function (info, opts) {
  if (opts.level !== false) {
    info.level = colors.strip(info.level);
  }
  if (opts.message !== false) {
    info.message = colors.strip(String(info.message));
  }
  if (opts.raw !== false && info[MESSAGE]) {
    info[MESSAGE] = colors.strip(String(info[MESSAGE]));
  }
  return info;
});