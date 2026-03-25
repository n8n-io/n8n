import deepGet from './_deepGet.js';
import toPath from './_toPath.js';

// Creates a function that, when passed an object, will traverse that object’s
// properties down the given `path`, specified as an array of keys or indices.
export default function property(path) {
  path = toPath(path);
  return function(obj) {
    return deepGet(obj, path);
  };
}
