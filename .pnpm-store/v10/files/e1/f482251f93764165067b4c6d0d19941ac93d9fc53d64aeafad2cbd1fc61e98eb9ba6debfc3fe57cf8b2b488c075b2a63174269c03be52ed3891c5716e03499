"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hasFloat16ArrayBrand = hasFloat16ArrayBrand;
var _is = require("./is.cjs");
var _messages = require("./messages.cjs");
var _primordials = require("./primordials.cjs");
const brand = exports.brand = (0, _primordials.SymbolFor)("__Float16Array__");
function hasFloat16ArrayBrand(target) {
  if (!(0, _is.isObjectLike)(target)) {
    return false;
  }
  const prototype = (0, _primordials.ReflectGetPrototypeOf)(target);
  if (!(0, _is.isObjectLike)(prototype)) {
    return false;
  }
  const constructor = prototype.constructor;
  if (constructor === undefined) {
    return false;
  }
  if (!(0, _is.isObject)(constructor)) {
    throw (0, _primordials.NativeTypeError)(_messages.THE_CONSTRUCTOR_PROPERTY_VALUE_IS_NOT_AN_OBJECT);
  }
  return (0, _primordials.ReflectHas)(constructor, brand);
}