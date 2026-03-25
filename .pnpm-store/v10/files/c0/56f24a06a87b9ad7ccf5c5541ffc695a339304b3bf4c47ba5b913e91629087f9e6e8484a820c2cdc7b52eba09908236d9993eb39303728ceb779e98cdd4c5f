var filter = require('./filter.js');
var negate = require('./negate.js');
var _cb = require('./_cb.js');

// Return all the elements for which a truth test fails.
function reject(obj, predicate, context) {
  return filter(obj, negate(_cb(predicate)), context);
}

module.exports = reject;
