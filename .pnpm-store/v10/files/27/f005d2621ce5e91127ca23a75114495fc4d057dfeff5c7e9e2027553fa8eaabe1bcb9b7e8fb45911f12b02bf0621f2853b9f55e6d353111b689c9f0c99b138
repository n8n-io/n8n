import find from './find.js';
import matcher from './matcher.js';

// Convenience version of a common use case of `_.find`: getting the first
// object containing specific `key:value` pairs.
export default function findWhere(obj, attrs) {
  return find(obj, matcher(attrs));
}
