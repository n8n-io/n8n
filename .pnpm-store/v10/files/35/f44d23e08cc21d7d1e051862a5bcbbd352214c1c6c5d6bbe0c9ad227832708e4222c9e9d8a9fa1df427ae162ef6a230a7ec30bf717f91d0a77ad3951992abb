var isObject = require('./isObject.js');
var _setup = require('./_setup.js');
var _collectNonEnumProps = require('./_collectNonEnumProps.js');

// Retrieve all the enumerable property names of an object.
function allKeys(obj) {
  if (!isObject(obj)) return [];
  var keys = [];
  for (var key in obj) keys.push(key);
  // Ahem, IE < 9.
  if (_setup.hasEnumBug) _collectNonEnumProps(obj, keys);
  return keys;
}

module.exports = allKeys;
