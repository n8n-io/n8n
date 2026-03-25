import isArrayLike from './_isArrayLike.js';
import keys from './keys.js';

// Return the number of elements in a collection.
export default function size(obj) {
  if (obj == null) return 0;
  return isArrayLike(obj) ? obj.length : keys(obj).length;
}
