var _toPath = require('./_toPath.js');
var _deepGet = require('./_deepGet.js');
var isUndefined = require('./isUndefined.js');

// Get the value of the (deep) property on `path` from `object`.
// If any property in `path` does not exist or if the value is
// `undefined`, return `defaultValue` instead.
// The `path` is normalized through `_.toPath`.
function get(object, path, defaultValue) {
  var value = _deepGet(object, _toPath(path));
  return isUndefined(value) ? defaultValue : value;
}

module.exports = get;
