define(['./restArguments', './isFunction', './_optimizeCb', './allKeys', './_keyInObj', './_flatten'], function (restArguments, isFunction, _optimizeCb, allKeys, _keyInObj, _flatten) {

  // Return a copy of the object only containing the allowed properties.
  var pick = restArguments(function(obj, keys) {
    var result = {}, iteratee = keys[0];
    if (obj == null) return result;
    if (isFunction(iteratee)) {
      if (keys.length > 1) iteratee = _optimizeCb(iteratee, keys[1]);
      keys = allKeys(obj);
    } else {
      iteratee = _keyInObj;
      keys = _flatten(keys, false, false);
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  });

  return pick;

});
