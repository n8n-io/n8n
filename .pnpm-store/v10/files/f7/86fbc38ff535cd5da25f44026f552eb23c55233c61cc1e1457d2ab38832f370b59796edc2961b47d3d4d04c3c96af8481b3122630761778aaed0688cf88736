import restArguments from './restArguments.js';
import uniq from './uniq.js';
import flatten from './_flatten.js';

// Produce an array that contains the union: each distinct element from all of
// the passed-in arrays.
export default restArguments(function(arrays) {
  return uniq(flatten(arrays, true, true));
});
