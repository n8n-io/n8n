import cb from './_cb.js';
import isArrayLike from './_isArrayLike.js';
import keys from './keys.js';

// Determine whether all of the elements pass a truth test.
export default function every(obj, predicate, context) {
  predicate = cb(predicate, context);
  var _keys = !isArrayLike(obj) && keys(obj),
      length = (_keys || obj).length;
  for (var index = 0; index < length; index++) {
    var currentKey = _keys ? _keys[index] : index;
    if (!predicate(obj[currentKey], currentKey, obj)) return false;
  }
  return true;
}
