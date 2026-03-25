'use strict';
var lengthOfArrayLike = require('../internals/length-of-array-like');

// https://tc39.es/ecma262/#sec-array.prototype.toreversed
// https://tc39.es/ecma262/#sec-%typedarray%.prototype.toreversed
module.exports = function (O, C) {
  var len = lengthOfArrayLike(O);
  var A = new C(len);
  var k = 0;
  for (; k < len; k++) A[k] = O[len - k - 1];
  return A;
};
