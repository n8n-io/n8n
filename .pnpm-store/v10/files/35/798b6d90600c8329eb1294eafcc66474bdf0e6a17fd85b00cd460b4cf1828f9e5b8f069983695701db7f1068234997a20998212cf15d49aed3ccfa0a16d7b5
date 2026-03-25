define(['./_getLength', './isArray', './isString', './isArguments', './keys'], function (_getLength, isArray, isString, isArguments, keys) {

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  function isEmpty(obj) {
    if (obj == null) return true;
    // Skip the more expensive `toString`-based type checks if `obj` has no
    // `.length`.
    var length = _getLength(obj);
    if (typeof length == 'number' && (
      isArray(obj) || isString(obj) || isArguments(obj)
    )) return length === 0;
    return _getLength(keys(obj)) === 0;
  }

  return isEmpty;

});
