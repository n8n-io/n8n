var _cb = require('./_cb.js');
var _isArrayLike = require('./_isArrayLike.js');
var keys = require('./keys.js');

// Determine whether all of the elements pass a truth test.
function every(obj, predicate, context) {
  predicate = _cb(predicate, context);
  var _keys = !_isArrayLike(obj) && keys(obj),
      length = (_keys || obj).length;
  for (var index = 0; index < length; index++) {
    var currentKey = _keys ? _keys[index] : index;
    if (!predicate(obj[currentKey], currentKey, obj)) return false;
  }
  return true;
}

module.exports = every;
