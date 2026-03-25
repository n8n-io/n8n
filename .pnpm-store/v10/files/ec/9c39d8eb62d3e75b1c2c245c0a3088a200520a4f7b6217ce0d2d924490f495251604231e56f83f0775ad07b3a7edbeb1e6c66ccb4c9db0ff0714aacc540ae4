var restArguments = require('./restArguments.js');
var _flatten = require('./_flatten.js');
var filter = require('./filter.js');
var contains = require('./contains.js');

// Take the difference between one array and a number of other arrays.
// Only the elements present in just the first array will remain.
var difference = restArguments(function(array, rest) {
  rest = _flatten(rest, true, true);
  return filter(array, function(value){
    return !contains(rest, value);
  });
});

module.exports = difference;
