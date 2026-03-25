import { isArray, isObject, isString } from '@vue/shared';
export { isArray, isDate, isFunction, isObject, isPromise, isString, isSymbol } from '@vue/shared';
import { isNil } from 'lodash-unified';
export { isVNode } from 'vue';

const isUndefined = (val) => val === void 0;
const isBoolean = (val) => typeof val === "boolean";
const isNumber = (val) => typeof val === "number";
const isEmpty = (val) => !val && val !== 0 || isArray(val) && val.length === 0 || isObject(val) && !Object.keys(val).length;
const isElement = (e) => {
  if (typeof Element === "undefined")
    return false;
  return e instanceof Element;
};
const isPropAbsent = (prop) => {
  return isNil(prop);
};
const isStringNumber = (val) => {
  if (!isString(val)) {
    return false;
  }
  return !Number.isNaN(Number(val));
};

export { isBoolean, isElement, isEmpty, isNumber, isPropAbsent, isStringNumber, isUndefined };
//# sourceMappingURL=types.mjs.map
