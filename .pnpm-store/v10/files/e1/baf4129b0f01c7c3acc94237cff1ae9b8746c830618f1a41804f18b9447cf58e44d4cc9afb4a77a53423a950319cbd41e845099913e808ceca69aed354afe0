define(['./_group', './_has'], function (_group, _has) {

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  var groupBy = _group(function(result, value, key) {
    if (_has(result, key)) result[key].push(value); else result[key] = [value];
  });

  return groupBy;

});
