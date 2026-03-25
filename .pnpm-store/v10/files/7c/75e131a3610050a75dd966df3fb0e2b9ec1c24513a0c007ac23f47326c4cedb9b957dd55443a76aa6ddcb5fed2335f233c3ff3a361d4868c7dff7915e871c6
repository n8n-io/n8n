define(['./_setup', './isDataView', './constant', './_isBufferLike'], function (_setup, isDataView, constant, _isBufferLike) {

  // Is a given value a typed array?
  var typedArrayPattern = /\[object ((I|Ui)nt(8|16|32)|Float(32|64)|Uint8Clamped|Big(I|Ui)nt64)Array\]/;
  function isTypedArray(obj) {
    // `ArrayBuffer.isView` is the most future-proof, so use it when available.
    // Otherwise, fall back on the above regular expression.
    return _setup.nativeIsView ? (_setup.nativeIsView(obj) && !isDataView(obj)) :
                  _isBufferLike(obj) && typedArrayPattern.test(_setup.toString.call(obj));
  }

  var isTypedArray$1 = _setup.supportsArrayBuffer ? isTypedArray : constant(false);

  return isTypedArray$1;

});
