import tagTester from './_tagTester.js';
import isFunction from './isFunction.js';
import isArrayBuffer from './isArrayBuffer.js';
import { hasDataViewBug } from './_stringTagBug.js';

var isDataView = tagTester('DataView');

// In IE 10 - Edge 13, we need a different heuristic
// to determine whether an object is a `DataView`.
// Also, in cases where the native `DataView` is
// overridden we can't rely on the tag itself.
function alternateIsDataView(obj) {
  return obj != null && isFunction(obj.getInt8) && isArrayBuffer(obj.buffer);
}

export default (hasDataViewBug ? alternateIsDataView : isDataView);
