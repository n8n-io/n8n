define(['./_cb', './keys'], function (_cb, keys) {

  // Returns the first key on an object that passes a truth test.
  function findKey(obj, predicate, context) {
    predicate = _cb(predicate, context);
    var _keys = keys(obj), key;
    for (var i = 0, length = _keys.length; i < length; i++) {
      key = _keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  }

  return findKey;

});
