'use strict';
// TODO: Remove from `core-js@4`
var ArrayBufferViewCore = require('../internals/array-buffer-view-core');
var $group = require('../internals/array-group');
var typedArraySpeciesConstructor = require('../internals/typed-array-species-constructor');

var aTypedArray = ArrayBufferViewCore.aTypedArray;
var exportTypedArrayMethod = ArrayBufferViewCore.exportTypedArrayMethod;

// `%TypedArray%.prototype.groupBy` method
// https://github.com/tc39/proposal-array-grouping
exportTypedArrayMethod('groupBy', function groupBy(callbackfn /* , thisArg */) {
  var thisArg = arguments.length > 1 ? arguments[1] : undefined;
  return $group(aTypedArray(this), callbackfn, thisArg, typedArraySpeciesConstructor);
}, true);
