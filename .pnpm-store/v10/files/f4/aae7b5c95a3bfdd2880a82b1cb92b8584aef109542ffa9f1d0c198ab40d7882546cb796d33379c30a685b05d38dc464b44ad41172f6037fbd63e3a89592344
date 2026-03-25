"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAnyArrayBuffer = isAnyArrayBuffer;
exports.isCanonicalIntegerIndexString = isCanonicalIntegerIndexString;
exports.isNativeBigIntTypedArray = isNativeBigIntTypedArray;
exports.isNativeTypedArray = isNativeTypedArray;
exports.isObject = isObject;
exports.isObjectLike = isObjectLike;
exports.isOrdinaryArray = isOrdinaryArray;
exports.isOrdinaryNativeTypedArray = isOrdinaryNativeTypedArray;
exports.isSharedArrayBuffer = isSharedArrayBuffer;
var _primordials = require("./primordials.cjs");
function isObject(value) {
  return value !== null && typeof value === "object" || typeof value === "function";
}
function isObjectLike(value) {
  return value !== null && typeof value === "object";
}
function isNativeTypedArray(value) {
  return (0, _primordials.TypedArrayPrototypeGetSymbolToStringTag)(value) !== undefined;
}
function isNativeBigIntTypedArray(value) {
  const typedArrayName = (0, _primordials.TypedArrayPrototypeGetSymbolToStringTag)(value);
  return typedArrayName === "BigInt64Array" || typedArrayName === "BigUint64Array";
}
function isArrayBuffer(value) {
  try {
    if ((0, _primordials.ArrayIsArray)(value)) {
      return false;
    }
    (0, _primordials.ArrayBufferPrototypeGetByteLength)(value);
    return true;
  } catch (e) {
    return false;
  }
}
function isSharedArrayBuffer(value) {
  if (_primordials.NativeSharedArrayBuffer === null) {
    return false;
  }
  try {
    (0, _primordials.SharedArrayBufferPrototypeGetByteLength)(value);
    return true;
  } catch (e) {
    return false;
  }
}
function isAnyArrayBuffer(value) {
  return isArrayBuffer(value) || isSharedArrayBuffer(value);
}
function isOrdinaryArray(value) {
  if (!(0, _primordials.ArrayIsArray)(value)) {
    return false;
  }
  return value[_primordials.SymbolIterator] === _primordials.NativeArrayPrototypeSymbolIterator && _primordials.ArrayIteratorPrototype.next === _primordials.ArrayIteratorPrototypeNext;
}
function isOrdinaryNativeTypedArray(value) {
  if (!isNativeTypedArray(value)) {
    return false;
  }
  return value[_primordials.SymbolIterator] === _primordials.NativeTypedArrayPrototypeSymbolIterator && _primordials.ArrayIteratorPrototype.next === _primordials.ArrayIteratorPrototypeNext;
}
function isCanonicalIntegerIndexString(value) {
  if (typeof value !== "string") {
    return false;
  }
  const number = +value;
  if (value !== number + "") {
    return false;
  }
  if (!(0, _primordials.NumberIsFinite)(number)) {
    return false;
  }
  return number === (0, _primordials.MathTrunc)(number);
}