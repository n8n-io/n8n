var restArguments = require('./restArguments.js');
var uniq = require('./uniq.js');
var _flatten = require('./_flatten.js');

// Produce an array that contains the union: each distinct element from all of
// the passed-in arrays.
var union = restArguments(function(arrays) {
  return uniq(_flatten(arrays, true, true));
});

module.exports = union;
