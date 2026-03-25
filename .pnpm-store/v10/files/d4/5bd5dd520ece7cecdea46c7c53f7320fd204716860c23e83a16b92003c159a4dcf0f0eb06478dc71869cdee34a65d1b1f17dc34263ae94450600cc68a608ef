import isArrayLike from './_isArrayLike.js';
import findIndex from './findIndex.js';
import findKey from './findKey.js';

// Return the first value which passes a truth test.
export default function find(obj, predicate, context) {
  var keyFinder = isArrayLike(obj) ? findIndex : findKey;
  var key = keyFinder(obj, predicate, context);
  if (key !== void 0 && key !== -1) return obj[key];
}
