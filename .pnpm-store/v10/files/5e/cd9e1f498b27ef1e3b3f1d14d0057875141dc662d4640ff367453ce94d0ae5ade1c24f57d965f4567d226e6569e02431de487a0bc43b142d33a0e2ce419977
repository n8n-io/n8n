'use strict';
var aSet = require('../internals/a-set');
var SetHelpers = require('../internals/set-helpers');
var clone = require('../internals/set-clone');
var getSetRecord = require('../internals/get-set-record');
var iterateSimple = require('../internals/iterate-simple');

var add = SetHelpers.add;
var has = SetHelpers.has;
var remove = SetHelpers.remove;

// `Set.prototype.symmetricDifference` method
// https://github.com/tc39/proposal-set-methods
module.exports = function symmetricDifference(other) {
  var O = aSet(this);
  var keysIter = getSetRecord(other).getIterator();
  var result = clone(O);
  iterateSimple(keysIter, function (e) {
    if (has(O, e)) remove(result, e);
    else add(result, e);
  });
  return result;
};
