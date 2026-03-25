var extendOwn = require('./extendOwn.js');
var isMatch = require('./isMatch.js');

// Returns a predicate for checking whether an object has a given set of
// `key:value` pairs.
function matcher(attrs) {
  attrs = extendOwn({}, attrs);
  return function(obj) {
    return isMatch(obj, attrs);
  };
}

module.exports = matcher;
