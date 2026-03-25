'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var shared = require('@vue/shared');
var lodashUnified = require('lodash-unified');
var vue = require('vue');

const isUndefined = (val) => val === void 0;
const isBoolean = (val) => typeof val === "boolean";
const isNumber = (val) => typeof val === "number";
const isEmpty = (val) => !val && val !== 0 || shared.isArray(val) && val.length === 0 || shared.isObject(val) && !Object.keys(val).length;
const isElement = (e) => {
  if (typeof Element === "undefined")
    return false;
  return e instanceof Element;
};
const isPropAbsent = (prop) => {
  return lodashUnified.isNil(prop);
};
const isStringNumber = (val) => {
  if (!shared.isString(val)) {
    return false;
  }
  return !Number.isNaN(Number(val));
};

Object.defineProperty(exports, 'isArray', {
  enumerable: true,
  get: function () { return shared.isArray; }
});
Object.defineProperty(exports, 'isDate', {
  enumerable: true,
  get: function () { return shared.isDate; }
});
Object.defineProperty(exports, 'isFunction', {
  enumerable: true,
  get: function () { return shared.isFunction; }
});
Object.defineProperty(exports, 'isObject', {
  enumerable: true,
  get: function () { return shared.isObject; }
});
Object.defineProperty(exports, 'isPromise', {
  enumerable: true,
  get: function () { return shared.isPromise; }
});
Object.defineProperty(exports, 'isString', {
  enumerable: true,
  get: function () { return shared.isString; }
});
Object.defineProperty(exports, 'isSymbol', {
  enumerable: true,
  get: function () { return shared.isSymbol; }
});
Object.defineProperty(exports, 'isVNode', {
  enumerable: true,
  get: function () { return vue.isVNode; }
});
exports.isBoolean = isBoolean;
exports.isElement = isElement;
exports.isEmpty = isEmpty;
exports.isNumber = isNumber;
exports.isPropAbsent = isPropAbsent;
exports.isStringNumber = isStringNumber;
exports.isUndefined = isUndefined;
//# sourceMappingURL=types.js.map
