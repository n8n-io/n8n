define(['./_toPath', './_deepGet', './isUndefined'], function (_toPath, _deepGet, isUndefined) {

  // Get the value of the (deep) property on `path` from `object`.
  // If any property in `path` does not exist or if the value is
  // `undefined`, return `defaultValue` instead.
  // The `path` is normalized through `_.toPath`.
  function get(object, path, defaultValue) {
    var value = _deepGet(object, _toPath(path));
    return isUndefined(value) ? defaultValue : value;
  }

  return get;

});
