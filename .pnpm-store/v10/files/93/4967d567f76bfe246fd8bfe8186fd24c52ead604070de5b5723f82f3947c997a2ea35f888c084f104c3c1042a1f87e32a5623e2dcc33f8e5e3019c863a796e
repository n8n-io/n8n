var _tagTester = require('./_tagTester.js');
var isFunction = require('./isFunction.js');
var isArrayBuffer = require('./isArrayBuffer.js');
var _stringTagBug = require('./_stringTagBug.js');

var isDataView = _tagTester('DataView');

// In IE 10 - Edge 13, we need a different heuristic
// to determine whether an object is a `DataView`.
// Also, in cases where the native `DataView` is
// overridden we can't rely on the tag itself.
function alternateIsDataView(obj) {
  return obj != null && isFunction(obj.getInt8) && isArrayBuffer(obj.buffer);
}

var isDataView$1 = (_stringTagBug.hasDataViewBug ? alternateIsDataView : isDataView);

module.exports = isDataView$1;
