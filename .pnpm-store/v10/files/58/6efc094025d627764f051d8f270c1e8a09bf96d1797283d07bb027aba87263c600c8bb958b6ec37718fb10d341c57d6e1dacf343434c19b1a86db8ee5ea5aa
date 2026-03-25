import restArguments from './restArguments.js';
import isFunction from './isFunction.js';
import optimizeCb from './_optimizeCb.js';
import allKeys from './allKeys.js';
import keyInObj from './_keyInObj.js';
import flatten from './_flatten.js';

// Return a copy of the object only containing the allowed properties.
export default restArguments(function(obj, keys) {
  var result = {}, iteratee = keys[0];
  if (obj == null) return result;
  if (isFunction(iteratee)) {
    if (keys.length > 1) iteratee = optimizeCb(iteratee, keys[1]);
    keys = allKeys(obj);
  } else {
    iteratee = keyInObj;
    keys = flatten(keys, false, false);
    obj = Object(obj);
  }
  for (var i = 0, length = keys.length; i < length; i++) {
    var key = keys[i];
    var value = obj[key];
    if (iteratee(value, key, obj)) result[key] = value;
  }
  return result;
});
