'use strict';

var _this = void 0;
var format = require('./format');
var ms = require('ms');

/*
 * function ms (info)
 * Returns an `info` with a `ms` property. The `ms` property holds the Value
 * of the time difference between two calls in milliseconds.
 */
module.exports = format(function (info) {
  var curr = +new Date();
  _this.diff = curr - (_this.prevTime || curr);
  _this.prevTime = curr;
  info.ms = "+".concat(ms(_this.diff));
  return info;
});