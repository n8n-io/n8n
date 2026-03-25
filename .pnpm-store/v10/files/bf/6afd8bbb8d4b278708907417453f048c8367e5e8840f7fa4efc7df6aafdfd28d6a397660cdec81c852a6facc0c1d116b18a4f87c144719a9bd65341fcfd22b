var _cb = require('./_cb.js');
var _getLength = require('./_getLength.js');

// Internal function to generate `_.findIndex` and `_.findLastIndex`.
function createPredicateIndexFinder(dir) {
  return function(array, predicate, context) {
    predicate = _cb(predicate, context);
    var length = _getLength(array);
    var index = dir > 0 ? 0 : length - 1;
    for (; index >= 0 && index < length; index += dir) {
      if (predicate(array[index], index, array)) return index;
    }
    return -1;
  };
}

module.exports = createPredicateIndexFinder;
