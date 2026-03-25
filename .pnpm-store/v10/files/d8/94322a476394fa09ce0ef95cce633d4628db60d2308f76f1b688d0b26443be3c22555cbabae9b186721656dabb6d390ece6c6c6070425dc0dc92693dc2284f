define(['./_isArrayLike', './keys'], function (_isArrayLike, keys) {

  // Return the number of elements in a collection.
  function size(obj) {
    if (obj == null) return 0;
    return _isArrayLike(obj) ? obj.length : keys(obj).length;
  }

  return size;

});
