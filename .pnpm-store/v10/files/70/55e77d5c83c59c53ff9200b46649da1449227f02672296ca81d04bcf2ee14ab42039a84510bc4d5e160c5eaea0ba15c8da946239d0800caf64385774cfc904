var isArray = require('./isArray.js');
var _setup = require('./_setup.js');
var isString = require('./isString.js');
var _isArrayLike = require('./_isArrayLike.js');
var map = require('./map.js');
var identity = require('./identity.js');
var values = require('./values.js');

// Safely create a real, live array from anything iterable.
var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
function toArray(obj) {
  if (!obj) return [];
  if (isArray(obj)) return _setup.slice.call(obj);
  if (isString(obj)) {
    // Keep surrogate pair characters together.
    return obj.match(reStrSymbol);
  }
  if (_isArrayLike(obj)) return map(obj, identity);
  return values(obj);
}

module.exports = toArray;
