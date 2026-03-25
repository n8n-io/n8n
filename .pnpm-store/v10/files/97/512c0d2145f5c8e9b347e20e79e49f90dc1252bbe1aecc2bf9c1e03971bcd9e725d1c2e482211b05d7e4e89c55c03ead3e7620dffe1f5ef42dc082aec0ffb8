import group from './_group.js';
import has from './_has.js';

// Groups the object's values by a criterion. Pass either a string attribute
// to group by, or a function that returns the criterion.
export default group(function(result, value, key) {
  if (has(result, key)) result[key].push(value); else result[key] = [value];
});
