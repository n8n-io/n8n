define(['./_group', './_has'], function (_group, _has) {

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  var countBy = _group(function(result, value, key) {
    if (_has(result, key)) result[key]++; else result[key] = 1;
  });

  return countBy;

});
