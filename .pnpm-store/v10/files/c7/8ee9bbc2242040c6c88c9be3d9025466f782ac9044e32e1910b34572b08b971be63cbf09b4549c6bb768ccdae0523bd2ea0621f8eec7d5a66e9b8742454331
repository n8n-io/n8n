var restArguments = require('./restArguments.js');
var isFunction = require('./isFunction.js');
var _optimizeCb = require('./_optimizeCb.js');
var allKeys = require('./allKeys.js');
var _keyInObj = require('./_keyInObj.js');
var _flatten = require('./_flatten.js');

// Return a copy of the object only containing the allowed properties.
var pick = restArguments(function(obj, keys) {
  var result = {}, iteratee = keys[0];
  if (obj == null) return result;
  if (isFunction(iteratee)) {
    if (keys.length > 1) iteratee = _optimizeCb(iteratee, keys[1]);
    keys = allKeys(obj);
  } else {
    iteratee = _keyInObj;
    keys = _flatten(keys, false, false);
    obj = Object(obj);
  }
  for (var i = 0, length = keys.length; i < length; i++) {
    var key = keys[i];
    var value = obj[key];
    if (iteratee(value, key, obj)) result[key] = value;
  }
  return result;
});

module.exports = pick;
