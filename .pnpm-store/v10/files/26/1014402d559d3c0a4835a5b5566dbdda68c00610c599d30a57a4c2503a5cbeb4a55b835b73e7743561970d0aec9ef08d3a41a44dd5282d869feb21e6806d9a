'use strict';
var $ = require('../internals/export');
var isDisjointFrom = require('../internals/set-is-disjoint-from');
var setMethodAcceptSetLike = require('../internals/set-method-accept-set-like');

// `Set.prototype.isDisjointFrom` method
// https://github.com/tc39/proposal-set-methods
$({ target: 'Set', proto: true, real: true, forced: !setMethodAcceptSetLike('isDisjointFrom') }, {
  isDisjointFrom: isDisjointFrom
});
