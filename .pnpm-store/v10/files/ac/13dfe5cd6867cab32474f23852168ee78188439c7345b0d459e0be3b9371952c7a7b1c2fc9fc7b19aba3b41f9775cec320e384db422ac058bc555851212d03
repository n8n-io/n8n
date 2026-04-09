'use strict';
var $ = require('../internals/export');
var symmetricDifference = require('../internals/set-symmetric-difference');
var setMethodAcceptSetLike = require('../internals/set-method-accept-set-like');

// `Set.prototype.symmetricDifference` method
// https://github.com/tc39/proposal-set-methods
$({ target: 'Set', proto: true, real: true, forced: !setMethodAcceptSetLike('symmetricDifference') }, {
  symmetricDifference: symmetricDifference
});
