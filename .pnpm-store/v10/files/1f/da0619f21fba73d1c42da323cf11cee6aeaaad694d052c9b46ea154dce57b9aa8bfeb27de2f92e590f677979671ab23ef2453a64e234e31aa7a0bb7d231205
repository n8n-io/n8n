var restArguments = require('./restArguments.js');
var isFunction = require('./isFunction.js');
var negate = require('./negate.js');
var map = require('./map.js');
var _flatten = require('./_flatten.js');
var contains = require('./contains.js');
var pick = require('./pick.js');

// Return a copy of the object without the disallowed properties.
var omit = restArguments(function(obj, keys) {
  var iteratee = keys[0], context;
  if (isFunction(iteratee)) {
    iteratee = negate(iteratee);
    if (keys.length > 1) context = keys[1];
  } else {
    keys = map(_flatten(keys, false, false), String);
    iteratee = function(value, key) {
      return !contains(keys, key);
    };
  }
  return pick(obj, iteratee, context);
});

module.exports = omit;
