import identity from './identity.js';
import isFunction from './isFunction.js';
import isObject from './isObject.js';
import isArray from './isArray.js';
import matcher from './matcher.js';
import property from './property.js';
import optimizeCb from './_optimizeCb.js';

// An internal function to generate callbacks that can be applied to each
// element in a collection, returning the desired result — either `_.identity`,
// an arbitrary callback, a property matcher, or a property accessor.
export default function baseIteratee(value, context, argCount) {
  if (value == null) return identity;
  if (isFunction(value)) return optimizeCb(value, context, argCount);
  if (isObject(value) && !isArray(value)) return matcher(value);
  return property(value);
}
