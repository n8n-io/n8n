import getLength from './_getLength.js';
import isArray from './isArray.js';
import isString from './isString.js';
import isArguments from './isArguments.js';
import keys from './keys.js';

// Is a given array, string, or object empty?
// An "empty" object has no enumerable own-properties.
export default function isEmpty(obj) {
  if (obj == null) return true;
  // Skip the more expensive `toString`-based type checks if `obj` has no
  // `.length`.
  var length = getLength(obj);
  if (typeof length == 'number' && (
    isArray(obj) || isString(obj) || isArguments(obj)
  )) return length === 0;
  return getLength(keys(obj)) === 0;
}
