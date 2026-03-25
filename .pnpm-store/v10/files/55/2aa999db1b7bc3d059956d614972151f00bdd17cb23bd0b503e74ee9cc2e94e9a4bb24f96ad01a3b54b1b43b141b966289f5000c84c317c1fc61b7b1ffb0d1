import group from './_group.js';
import has from './_has.js';

// Counts instances of an object that group by a certain criterion. Pass
// either a string attribute to count by, or a function that returns the
// criterion.
export default group(function(result, value, key) {
  if (has(result, key)) result[key]++; else result[key] = 1;
});
