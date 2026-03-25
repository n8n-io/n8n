import restArguments from './restArguments.js';
import isFunction from './isFunction.js';
import negate from './negate.js';
import map from './map.js';
import flatten from './_flatten.js';
import contains from './contains.js';
import pick from './pick.js';

// Return a copy of the object without the disallowed properties.
export default restArguments(function(obj, keys) {
  var iteratee = keys[0], context;
  if (isFunction(iteratee)) {
    iteratee = negate(iteratee);
    if (keys.length > 1) context = keys[1];
  } else {
    keys = map(flatten(keys, false, false), String);
    iteratee = function(value, key) {
      return !contains(keys, key);
    };
  }
  return pick(obj, iteratee, context);
});
