'use strict';
var $ = require('../internals/export');
var isSupersetOf = require('../internals/set-is-superset-of');
var setMethodAcceptSetLike = require('../internals/set-method-accept-set-like');

// `Set.prototype.isSupersetOf` method
// https://github.com/tc39/proposal-set-methods
$({ target: 'Set', proto: true, real: true, forced: !setMethodAcceptSetLike('isSupersetOf') }, {
  isSupersetOf: isSupersetOf
});
