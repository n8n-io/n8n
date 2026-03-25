'use strict';
var $ = require('../internals/export');
var union = require('../internals/set-union');
var setMethodAcceptSetLike = require('../internals/set-method-accept-set-like');

// `Set.prototype.union` method
// https://tc39.es/ecma262/#sec-set.prototype.union
$({ target: 'Set', proto: true, real: true, forced: !setMethodAcceptSetLike('union') }, {
  union: union
});
