define(['./_setup'], function (_setup) {

  // Common internal logic for `isArrayLike` and `isBufferLike`.
  function createSizePropertyCheck(getSizeProperty) {
    return function(collection) {
      var sizeProperty = getSizeProperty(collection);
      return typeof sizeProperty == 'number' && sizeProperty >= 0 && sizeProperty <= _setup.MAX_ARRAY_INDEX;
    }
  }

  return createSizePropertyCheck;

});
