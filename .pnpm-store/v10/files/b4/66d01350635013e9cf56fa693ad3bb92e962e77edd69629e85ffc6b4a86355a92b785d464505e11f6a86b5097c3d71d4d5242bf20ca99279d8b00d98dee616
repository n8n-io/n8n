"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IsDetachedBuffer = IsDetachedBuffer;
exports.SpeciesConstructor = SpeciesConstructor;
exports.ToIntegerOrInfinity = ToIntegerOrInfinity;
exports.ToLength = ToLength;
exports.defaultCompare = defaultCompare;
var _is = require("./is.cjs");
var _messages = require("./messages.cjs");
var _primordials = require("./primordials.cjs");
function ToIntegerOrInfinity(target) {
  const number = +target;
  if ((0, _primordials.NumberIsNaN)(number) || number === 0) {
    return 0;
  }
  return (0, _primordials.MathTrunc)(number);
}
function ToLength(target) {
  const length = ToIntegerOrInfinity(target);
  if (length < 0) {
    return 0;
  }
  return length < _primordials.MAX_SAFE_INTEGER ? length : _primordials.MAX_SAFE_INTEGER;
}
function SpeciesConstructor(target, defaultConstructor) {
  if (!(0, _is.isObject)(target)) {
    throw (0, _primordials.NativeTypeError)(_messages.THIS_IS_NOT_AN_OBJECT);
  }
  const constructor = target.constructor;
  if (constructor === undefined) {
    return defaultConstructor;
  }
  if (!(0, _is.isObject)(constructor)) {
    throw (0, _primordials.NativeTypeError)(_messages.THE_CONSTRUCTOR_PROPERTY_VALUE_IS_NOT_AN_OBJECT);
  }
  const species = constructor[_primordials.SymbolSpecies];
  if (species == null) {
    return defaultConstructor;
  }
  return species;
}
function IsDetachedBuffer(buffer) {
  if ((0, _is.isSharedArrayBuffer)(buffer)) {
    return false;
  }
  try {
    (0, _primordials.ArrayBufferPrototypeSlice)(buffer, 0, 0);
    return false;
  } catch (e) {}
  return true;
}
function defaultCompare(x, y) {
  const isXNaN = (0, _primordials.NumberIsNaN)(x);
  const isYNaN = (0, _primordials.NumberIsNaN)(y);
  if (isXNaN && isYNaN) {
    return 0;
  }
  if (isXNaN) {
    return 1;
  }
  if (isYNaN) {
    return -1;
  }
  if (x < y) {
    return -1;
  }
  if (x > y) {
    return 1;
  }
  if (x === 0 && y === 0) {
    const isXPlusZero = (0, _primordials.ObjectIs)(x, 0);
    const isYPlusZero = (0, _primordials.ObjectIs)(y, 0);
    if (!isXPlusZero && isYPlusZero) {
      return -1;
    }
    if (isXPlusZero && !isYPlusZero) {
      return 1;
    }
  }
  return 0;
}