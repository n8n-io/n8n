var _isArrayLike = require('./_isArrayLike.js');
var values = require('./values.js');
var indexOf = require('./indexOf.js');

// Determine if the array or object contains a given item (using `===`).
function contains(obj, item, fromIndex, guard) {
  if (!_isArrayLike(obj)) obj = values(obj);
  if (typeof fromIndex != 'number' || guard) fromIndex = 0;
  return indexOf(obj, item, fromIndex) >= 0;
}

module.exports = contains;
