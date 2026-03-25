'use strict';
var aSet = require('../internals/a-set');
var add = require('../internals/set-helpers').add;
var clone = require('../internals/set-clone');
var getSetRecord = require('../internals/get-set-record');
var iterateSimple = require('../internals/iterate-simple');

// `Set.prototype.union` method
// https://github.com/tc39/proposal-set-methods
module.exports = function union(other) {
  var O = aSet(this);
  var keysIter = getSetRecord(other).getIterator();
  var result = clone(O);
  iterateSimple(keysIter, function (it) {
    add(result, it);
  });
  return result;
};
