define(['./_deepGet', './_toPath'], function (_deepGet, _toPath) {

  // Creates a function that, when passed an object, will traverse that object’s
  // properties down the given `path`, specified as an array of keys or indices.
  function property(path) {
    path = _toPath(path);
    return function(obj) {
      return _deepGet(obj, path);
    };
  }

  return property;

});
