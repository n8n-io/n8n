var identity = require('./identity.js');
var isFunction = require('./isFunction.js');
var isObject = require('./isObject.js');
var isArray = require('./isArray.js');
var matcher = require('./matcher.js');
var property = require('./property.js');
var _optimizeCb = require('./_optimizeCb.js');

// An internal function to generate callbacks that can be applied to each
// element in a collection, returning the desired result — either `_.identity`,
// an arbitrary callback, a property matcher, or a property accessor.
function baseIteratee(value, context, argCount) {
  if (value == null) return identity;
  if (isFunction(value)) return _optimizeCb(value, context, argCount);
  if (isObject(value) && !isArray(value)) return matcher(value);
  return property(value);
}

module.exports = baseIteratee;
