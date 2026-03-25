import restArguments from './restArguments.js';
import flatten from './_flatten.js';
import filter from './filter.js';
import contains from './contains.js';

// Take the difference between one array and a number of other arrays.
// Only the elements present in just the first array will remain.
export default restArguments(function(array, rest) {
  rest = flatten(rest, true, true);
  return filter(array, function(value){
    return !contains(rest, value);
  });
});
