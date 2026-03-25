import toPath from './_toPath.js';
import deepGet from './_deepGet.js';
import isUndefined from './isUndefined.js';

// Get the value of the (deep) property on `path` from `object`.
// If any property in `path` does not exist or if the value is
// `undefined`, return `defaultValue` instead.
// The `path` is normalized through `_.toPath`.
export default function get(object, path, defaultValue) {
  var value = deepGet(object, toPath(path));
  return isUndefined(value) ? defaultValue : value;
}
