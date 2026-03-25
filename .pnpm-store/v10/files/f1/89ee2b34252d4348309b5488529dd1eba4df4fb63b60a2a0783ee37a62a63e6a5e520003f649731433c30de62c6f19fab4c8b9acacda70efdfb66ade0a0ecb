define(['./isObject', './_setup', './_has', './_collectNonEnumProps'], function (isObject, _setup, _has, _collectNonEnumProps) {

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`.
  function keys(obj) {
    if (!isObject(obj)) return [];
    if (_setup.nativeKeys) return _setup.nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (_setup.hasEnumBug) _collectNonEnumProps(obj, keys);
    return keys;
  }

  return keys;

});
