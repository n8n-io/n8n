import filter from './filter.js';
import matcher from './matcher.js';

// Convenience version of a common use case of `_.filter`: selecting only
// objects containing specific `key:value` pairs.
export default function where(obj, attrs) {
  return filter(obj, matcher(attrs));
}
