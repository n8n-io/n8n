'use strict';
var $ = require('../internals/export');
var union = require('../internals/set-union');
var setMethodAcceptSetLike = require('../internals/set-method-accept-set-like');

// `Set.prototype.union` method
// https://github.com/tc39/proposal-set-methods
$({ target: 'Set', proto: true, real: true, forced: !setMethodAcceptSetLike('union') }, {
  union: union
});
