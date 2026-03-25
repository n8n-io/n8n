import isObject from './isObject.js';
import { nativeKeys, hasEnumBug } from './_setup.js';
import has from './_has.js';
import collectNonEnumProps from './_collectNonEnumProps.js';

// Retrieve the names of an object's own properties.
// Delegates to **ECMAScript 5**'s native `Object.keys`.
export default function keys(obj) {
  if (!isObject(obj)) return [];
  if (nativeKeys) return nativeKeys(obj);
  var keys = [];
  for (var key in obj) if (has(obj, key)) keys.push(key);
  // Ahem, IE < 9.
  if (hasEnumBug) collectNonEnumProps(obj, keys);
  return keys;
}
