import filter from './filter.js';
import negate from './negate.js';
import cb from './_cb.js';

// Return all the elements for which a truth test fails.
export default function reject(obj, predicate, context) {
  return filter(obj, negate(cb(predicate)), context);
}
