'use strict';
var $ = require('../internals/export');
var fails = require('../internals/fails');
var intersection = require('../internals/set-intersection');
var setMethodAcceptSetLike = require('../internals/set-method-accept-set-like');

var INCORRECT = !setMethodAcceptSetLike('intersection') || fails(function () {
  // eslint-disable-next-line es/no-array-from, es/no-set -- testing
  return Array.from(new Set([1, 2, 3]).intersection(new Set([3, 2]))) !== '3,2';
});

// `Set.prototype.intersection` method
// https://github.com/tc39/proposal-set-methods
$({ target: 'Set', proto: true, real: true, forced: INCORRECT }, {
  intersection: intersection
});
