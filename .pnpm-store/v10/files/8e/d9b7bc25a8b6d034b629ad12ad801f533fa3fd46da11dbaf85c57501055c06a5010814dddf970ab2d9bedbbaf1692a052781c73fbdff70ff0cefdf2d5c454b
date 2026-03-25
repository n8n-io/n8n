import isObject from './isObject.js';
import isArray from './isArray.js';
import extend from './extend.js';

// Create a (shallow-cloned) duplicate of an object.
export default function clone(obj) {
  if (!isObject(obj)) return obj;
  return isArray(obj) ? obj.slice() : extend({}, obj);
}
