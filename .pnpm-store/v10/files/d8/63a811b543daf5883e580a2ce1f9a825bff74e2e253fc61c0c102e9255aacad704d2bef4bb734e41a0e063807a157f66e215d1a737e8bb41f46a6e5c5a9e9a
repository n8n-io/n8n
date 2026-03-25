import max from './max.js';
import getLength from './_getLength.js';
import pluck from './pluck.js';

// Complement of zip. Unzip accepts an array of arrays and groups
// each array's elements on shared indices.
export default function unzip(array) {
  var length = (array && max(array, getLength).length) || 0;
  var result = Array(length);

  for (var index = 0; index < length; index++) {
    result[index] = pluck(array, index);
  }
  return result;
}
