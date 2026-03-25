'use strict';
var $ = require('../internals/export');
var difference = require('../internals/set-difference');
var setMethodAcceptSetLike = require('../internals/set-method-accept-set-like');

var INCORRECT = !setMethodAcceptSetLike('difference', function (result) {
  return result.size === 0;
});

// `Set.prototype.difference` method
// https://tc39.es/ecma262/#sec-set.prototype.difference
$({ target: 'Set', proto: true, real: true, forced: INCORRECT }, {
  difference: difference
});
