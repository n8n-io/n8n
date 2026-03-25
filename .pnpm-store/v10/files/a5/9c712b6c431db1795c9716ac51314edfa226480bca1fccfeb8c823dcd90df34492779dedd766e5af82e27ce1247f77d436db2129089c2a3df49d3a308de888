define(['./isObject', './_setup', './_collectNonEnumProps'], function (isObject, _setup, _collectNonEnumProps) {

  // Retrieve all the enumerable property names of an object.
  function allKeys(obj) {
    if (!isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (_setup.hasEnumBug) _collectNonEnumProps(obj, keys);
    return keys;
  }

  return allKeys;

});
