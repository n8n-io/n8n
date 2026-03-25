var underscore = require('./underscore.js');
var _baseIteratee = require('./_baseIteratee.js');

// External wrapper for our callback generator. Users may customize
// `_.iteratee` if they want additional predicate/iteratee shorthand styles.
// This abstraction hides the internal-only `argCount` argument.
function iteratee(value, context) {
  return _baseIteratee(value, context, Infinity);
}
underscore.iteratee = iteratee;

module.exports = iteratee;
