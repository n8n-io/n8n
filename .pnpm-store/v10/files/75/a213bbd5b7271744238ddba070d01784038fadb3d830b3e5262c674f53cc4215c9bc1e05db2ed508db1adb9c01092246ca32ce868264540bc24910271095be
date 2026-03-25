import isArray from './isArray.js';
import { slice } from './_setup.js';
import isString from './isString.js';
import isArrayLike from './_isArrayLike.js';
import map from './map.js';
import identity from './identity.js';
import values from './values.js';

// Safely create a real, live array from anything iterable.
var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
export default function toArray(obj) {
  if (!obj) return [];
  if (isArray(obj)) return slice.call(obj);
  if (isString(obj)) {
    // Keep surrogate pair characters together.
    return obj.match(reStrSymbol);
  }
  if (isArrayLike(obj)) return map(obj, identity);
  return values(obj);
}
