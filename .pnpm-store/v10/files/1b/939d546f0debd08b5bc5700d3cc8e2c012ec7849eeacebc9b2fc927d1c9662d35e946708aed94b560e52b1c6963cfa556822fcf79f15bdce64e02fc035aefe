var underscore = require('./underscore.js');
var _baseIteratee = require('./_baseIteratee.js');
var iteratee = require('./iteratee.js');

// The function we call internally to generate a callback. It invokes
// `_.iteratee` if overridden, otherwise `baseIteratee`.
function cb(value, context, argCount) {
  if (underscore.iteratee !== iteratee) return underscore.iteratee(value, context);
  return _baseIteratee(value, context, argCount);
}

module.exports = cb;
