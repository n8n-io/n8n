define(['./_cb', './_isArrayLike', './keys'], function (_cb, _isArrayLike, keys) {

  // Determine if at least one element in the object passes a truth test.
  function some(obj, predicate, context) {
    predicate = _cb(predicate, context);
    var _keys = !_isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  }

  return some;

});
