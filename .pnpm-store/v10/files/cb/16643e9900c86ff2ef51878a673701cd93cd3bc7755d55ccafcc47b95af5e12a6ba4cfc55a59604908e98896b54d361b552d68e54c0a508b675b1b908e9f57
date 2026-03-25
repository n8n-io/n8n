import extendOwn from './extendOwn.js';
import isMatch from './isMatch.js';

// Returns a predicate for checking whether an object has a given set of
// `key:value` pairs.
export default function matcher(attrs) {
  attrs = extendOwn({}, attrs);
  return function(obj) {
    return isMatch(obj, attrs);
  };
}
