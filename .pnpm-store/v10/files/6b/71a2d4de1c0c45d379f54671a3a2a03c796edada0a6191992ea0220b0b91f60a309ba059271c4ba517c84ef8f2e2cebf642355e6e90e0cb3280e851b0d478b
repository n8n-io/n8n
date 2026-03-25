Object.defineProperty(exports, '__esModule', { value: true });

var _setup = require('./_setup.js');
var _hasObjectTag = require('./_hasObjectTag.js');

// In IE 10 - Edge 13, `DataView` has string tag `'[object Object]'`.
// In IE 11, the most common among them, this problem also applies to
// `Map`, `WeakMap` and `Set`.
// Also, there are cases where an application can override the native
// `DataView` object, in cases like that we can't use the constructor
// safely and should just rely on alternate `DataView` checks
var hasDataViewBug = (
      _setup.supportsDataView && (!/\[native code\]/.test(String(DataView)) || _hasObjectTag(new DataView(new ArrayBuffer(8))))
    ),
    isIE11 = (typeof Map !== 'undefined' && _hasObjectTag(new Map));

exports.hasDataViewBug = hasDataViewBug;
exports.isIE11 = isIE11;
