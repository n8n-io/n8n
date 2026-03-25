define(['./_has', './_toPath'], function (_has, _toPath) {

  // Shortcut function for checking if an object has a given property directly on
  // itself (in other words, not on a prototype). Unlike the internal `has`
  // function, this public version can also traverse nested properties.
  function has(obj, path) {
    path = _toPath(path);
    var length = path.length;
    for (var i = 0; i < length; i++) {
      var key = path[i];
      if (!_has(obj, key)) return false;
      obj = obj[key];
    }
    return !!length;
  }

  return has;

});
