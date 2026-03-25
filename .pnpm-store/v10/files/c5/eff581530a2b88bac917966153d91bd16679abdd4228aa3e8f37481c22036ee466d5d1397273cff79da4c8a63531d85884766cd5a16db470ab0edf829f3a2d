var _group = require('./_group.js');
var _has = require('./_has.js');

// Groups the object's values by a criterion. Pass either a string attribute
// to group by, or a function that returns the criterion.
var groupBy = _group(function(result, value, key) {
  if (_has(result, key)) result[key].push(value); else result[key] = [value];
});

module.exports = groupBy;
