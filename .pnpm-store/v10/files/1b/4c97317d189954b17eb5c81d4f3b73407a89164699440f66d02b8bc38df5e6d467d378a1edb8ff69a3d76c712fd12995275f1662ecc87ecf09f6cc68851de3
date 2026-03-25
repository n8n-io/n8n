import isObject from './isObject.js';
import { hasEnumBug } from './_setup.js';
import collectNonEnumProps from './_collectNonEnumProps.js';

// Retrieve all the enumerable property names of an object.
export default function allKeys(obj) {
  if (!isObject(obj)) return [];
  var keys = [];
  for (var key in obj) keys.push(key);
  // Ahem, IE < 9.
  if (hasEnumBug) collectNonEnumProps(obj, keys);
  return keys;
}
