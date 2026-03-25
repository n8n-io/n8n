'use strict';

const format = require('./format');
const ms = require('ms');

/*
 * function ms (info)
 * Returns an `info` with a `ms` property. The `ms` property holds the Value
 * of the time difference between two calls in milliseconds.
 */
module.exports = format(info => {
  const curr = +new Date();
  this.diff = curr - (this.prevTime || curr);
  this.prevTime = curr;
  info.ms = `+${ms(this.diff)}`;

  return info;
});
