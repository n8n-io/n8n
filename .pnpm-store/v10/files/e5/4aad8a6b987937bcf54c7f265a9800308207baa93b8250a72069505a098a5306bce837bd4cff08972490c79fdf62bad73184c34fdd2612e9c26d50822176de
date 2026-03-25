var _isArrayLike = require('./_isArrayLike.js');
var keys = require('./keys.js');

// Return the number of elements in a collection.
function size(obj) {
  if (obj == null) return 0;
  return _isArrayLike(obj) ? obj.length : keys(obj).length;
}

module.exports = size;
