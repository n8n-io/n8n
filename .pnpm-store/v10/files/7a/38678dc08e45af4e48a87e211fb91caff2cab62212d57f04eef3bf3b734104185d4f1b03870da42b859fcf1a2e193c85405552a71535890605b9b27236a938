import { supportsArrayBuffer, nativeIsView, toString } from './_setup.js';
import isDataView from './isDataView.js';
import constant from './constant.js';
import isBufferLike from './_isBufferLike.js';

// Is a given value a typed array?
var typedArrayPattern = /\[object ((I|Ui)nt(8|16|32)|Float(32|64)|Uint8Clamped|Big(I|Ui)nt64)Array\]/;
function isTypedArray(obj) {
  // `ArrayBuffer.isView` is the most future-proof, so use it when available.
  // Otherwise, fall back on the above regular expression.
  return nativeIsView ? (nativeIsView(obj) && !isDataView(obj)) :
                isBufferLike(obj) && typedArrayPattern.test(toString.call(obj));
}

export default supportsArrayBuffer ? isTypedArray : constant(false);
