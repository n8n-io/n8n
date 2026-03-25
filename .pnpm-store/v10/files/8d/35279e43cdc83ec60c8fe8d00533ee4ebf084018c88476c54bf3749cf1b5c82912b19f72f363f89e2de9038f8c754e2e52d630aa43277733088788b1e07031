var max = require('./max.js');
var _getLength = require('./_getLength.js');
var pluck = require('./pluck.js');

// Complement of zip. Unzip accepts an array of arrays and groups
// each array's elements on shared indices.
function unzip(array) {
  var length = (array && max(array, _getLength).length) || 0;
  var result = Array(length);

  for (var index = 0; index < length; index++) {
    result[index] = pluck(array, index);
  }
  return result;
}

module.exports = unzip;
