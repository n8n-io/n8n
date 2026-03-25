var _cb = require('./_cb.js');
var each = require('./each.js');

// Return all the elements that pass a truth test.
function filter(obj, predicate, context) {
  var results = [];
  predicate = _cb(predicate, context);
  each(obj, function(value, index, list) {
    if (predicate(value, index, list)) results.push(value);
  });
  return results;
}

module.exports = filter;
