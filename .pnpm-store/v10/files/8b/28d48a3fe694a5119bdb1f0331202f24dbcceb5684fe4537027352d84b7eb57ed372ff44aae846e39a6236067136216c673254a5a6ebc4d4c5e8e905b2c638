import cb from './_cb.js';
import keys from './keys.js';

// Returns the results of applying the `iteratee` to each element of `obj`.
// In contrast to `_.map` it returns an object.
export default function mapObject(obj, iteratee, context) {
  iteratee = cb(iteratee, context);
  var _keys = keys(obj),
      length = _keys.length,
      results = {};
  for (var index = 0; index < length; index++) {
    var currentKey = _keys[index];
    results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
  }
  return results;
}
