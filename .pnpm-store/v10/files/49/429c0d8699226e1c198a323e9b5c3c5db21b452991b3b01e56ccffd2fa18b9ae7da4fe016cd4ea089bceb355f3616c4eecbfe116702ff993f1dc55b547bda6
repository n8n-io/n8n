var _deepGet = require('./_deepGet.js');
var _toPath = require('./_toPath.js');

// Creates a function that, when passed an object, will traverse that object’s
// properties down the given `path`, specified as an array of keys or indices.
function property(path) {
  path = _toPath(path);
  return function(obj) {
    return _deepGet(obj, path);
  };
}

module.exports = property;
