define(['exports'], function (exports) {

  // Current version.
  var VERSION = '1.13.8';

  // Establish the root object, `window` (`self`) in the browser, `global`
  // on the server, or `this` in some virtual machines. We use `self`
  // instead of `window` for `WebWorker` support.
  var root = (typeof self == 'object' && self.self === self && self) ||
            (typeof global == 'object' && global.global === global && global) ||
            Function('return this')() ||
            {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

  // Create quick reference variables for speed access to core prototypes.
  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;

  // Modern feature detection.
  var supportsArrayBuffer = typeof ArrayBuffer !== 'undefined',
      supportsDataView = typeof DataView !== 'undefined';

  // All **ECMAScript 5+** native function implementations that we hope to use
  // are declared here.
  var nativeIsArray = Array.isArray,
      nativeKeys = Object.keys,
      nativeCreate = Object.create,
      nativeIsView = supportsArrayBuffer && ArrayBuffer.isView;

  // Create references to these builtin functions because we override them.
  var _isNaN = isNaN,
      _isFinite = isFinite;

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
    'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  // The largest integer that can be represented exactly.
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;

  exports.ArrayProto = ArrayProto;
  exports.MAX_ARRAY_INDEX = MAX_ARRAY_INDEX;
  exports.ObjProto = ObjProto;
  exports.SymbolProto = SymbolProto;
  exports.VERSION = VERSION;
  exports._isFinite = _isFinite;
  exports._isNaN = _isNaN;
  exports.hasEnumBug = hasEnumBug;
  exports.hasOwnProperty = hasOwnProperty;
  exports.nativeCreate = nativeCreate;
  exports.nativeIsArray = nativeIsArray;
  exports.nativeIsView = nativeIsView;
  exports.nativeKeys = nativeKeys;
  exports.nonEnumerableProps = nonEnumerableProps;
  exports.push = push;
  exports.root = root;
  exports.slice = slice;
  exports.supportsArrayBuffer = supportsArrayBuffer;
  exports.supportsDataView = supportsDataView;
  exports.toString = toString;

  Object.defineProperty(exports, '__esModule', { value: true });

});
