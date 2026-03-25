var _isArrayLike = require('./_isArrayLike.js');
var findIndex = require('./findIndex.js');
var findKey = require('./findKey.js');

// Return the first value which passes a truth test.
function find(obj, predicate, context) {
  var keyFinder = _isArrayLike(obj) ? findIndex : findKey;
  var key = keyFinder(obj, predicate, context);
  if (key !== void 0 && key !== -1) return obj[key];
}

module.exports = find;
