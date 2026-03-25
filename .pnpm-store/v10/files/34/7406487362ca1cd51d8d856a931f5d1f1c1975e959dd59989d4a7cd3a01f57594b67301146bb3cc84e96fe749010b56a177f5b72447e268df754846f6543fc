'use strict';
var call = require('../internals/function-call');
var map = require('../internals/iterator-map');

var callback = function (value, counter) {
  return [counter, value];
};

// `Iterator.prototype.indexed` method
// https://github.com/tc39/proposal-iterator-helpers
module.exports = function indexed() {
  return call(map, this, callback);
};
