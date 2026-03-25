'use strict';

var fecha = require('fecha');
var format = require('./format');

/*
 * function timestamp (info)
 * Returns a new instance of the timestamp Format which adds a timestamp
 * to the info. It was previously available in winston < 3.0.0 as:
 *
 * - { timestamp: true }             // `new Date.toISOString()`
 * - { timestamp: function:String }  // Value returned by `timestamp()`
 */
module.exports = format(function (info) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (opts.format) {
    info.timestamp = typeof opts.format === 'function' ? opts.format() : fecha.format(new Date(), opts.format);
  }
  if (!info.timestamp) {
    info.timestamp = new Date().toISOString();
  }
  if (opts.alias) {
    info[opts.alias] = info.timestamp;
  }
  return info;
});