'use strict';

var array = require('./array-78849c95.cjs');
var object = require('./object-c0c9435b.cjs');
var equality = require('./equality.cjs');

/**
 * Common functions and function call helpers.
 *
 * @module function
 */

/**
 * Calls all functions in `fs` with args. Only throws after all functions were called.
 *
 * @param {Array<function>} fs
 * @param {Array<any>} args
 */
const callAll = (fs, args, i = 0) => {
  try {
    for (; i < fs.length; i++) {
      fs[i](...args);
    }
  } finally {
    if (i < fs.length) {
      callAll(fs, args, i + 1);
    }
  }
};

const nop = () => {};

/**
 * @template T
 * @param {function():T} f
 * @return {T}
 */
const apply = f => f();

/**
 * @template A
 *
 * @param {A} a
 * @return {A}
 */
const id = a => a;

/**
 * @template T
 *
 * @param {T} a
 * @param {T} b
 * @return {boolean}
 */
const equalityStrict = (a, b) => a === b;

/**
 * @template T
 *
 * @param {Array<T>|object} a
 * @param {Array<T>|object} b
 * @return {boolean}
 */
const equalityFlat = (a, b) => a === b || (a != null && b != null && a.constructor === b.constructor && ((array.isArray(a) && array.equalFlat(a, /** @type {Array<T>} */ (b))) || (typeof a === 'object' && object.equalFlat(a, b))));

/* c8 ignore start */

/**
 * @param {any} a
 * @param {any} b
 * @return {boolean}
 */
const equalityDeep = (a, b) => {
  if (a === b) {
    return true
  }
  if (a == null || b == null || (a.constructor !== b.constructor && (a.constructor || Object) !== (b.constructor || Object))) {
    return false
  }
  if (a[equality.EqualityTraitSymbol] != null) {
    return a[equality.EqualityTraitSymbol](b)
  }
  switch (a.constructor) {
    case ArrayBuffer:
      a = new Uint8Array(a);
      b = new Uint8Array(b);
    // eslint-disable-next-line no-fallthrough
    case Uint8Array: {
      if (a.byteLength !== b.byteLength) {
        return false
      }
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false
        }
      }
      break
    }
    case Set: {
      if (a.size !== b.size) {
        return false
      }
      for (const value of a) {
        if (!b.has(value)) {
          return false
        }
      }
      break
    }
    case Map: {
      if (a.size !== b.size) {
        return false
      }
      for (const key of a.keys()) {
        if (!b.has(key) || !equalityDeep(a.get(key), b.get(key))) {
          return false
        }
      }
      break
    }
    case undefined:
    case Object:
      if (object.size(a) !== object.size(b)) {
        return false
      }
      for (const key in a) {
        if (!object.hasProperty(a, key) || !equalityDeep(a[key], b[key])) {
          return false
        }
      }
      break
    case Array:
      if (a.length !== b.length) {
        return false
      }
      for (let i = 0; i < a.length; i++) {
        if (!equalityDeep(a[i], b[i])) {
          return false
        }
      }
      break
    default:
      return false
  }
  return true
};

/**
 * @template V
 * @template {V} OPTS
 *
 * @param {V} value
 * @param {Array<OPTS>} options
 */
// @ts-ignore
const isOneOf = (value, options) => options.includes(value);
/* c8 ignore stop */

const isArray = array.isArray;

/**
 * @param {any} s
 * @return {s is String}
 */
const isString = (s) => s && s.constructor === String;

/**
 * @param {any} n
 * @return {n is Number}
 */
const isNumber = n => n != null && n.constructor === Number;

/**
 * @template {abstract new (...args: any) => any} TYPE
 * @param {any} n
 * @param {TYPE} T
 * @return {n is InstanceType<TYPE>}
 */
const is = (n, T) => n && n.constructor === T;

/**
 * @template {abstract new (...args: any) => any} TYPE
 * @param {TYPE} T
 */
const isTemplate = (T) =>
  /**
   * @param {any} n
   * @return {n is InstanceType<TYPE>}
   **/
  n => n && n.constructor === T;

var _function = /*#__PURE__*/Object.freeze({
  __proto__: null,
  callAll: callAll,
  nop: nop,
  apply: apply,
  id: id,
  equalityStrict: equalityStrict,
  equalityFlat: equalityFlat,
  equalityDeep: equalityDeep,
  isOneOf: isOneOf,
  isArray: isArray,
  isString: isString,
  isNumber: isNumber,
  is: is,
  isTemplate: isTemplate
});

exports._function = _function;
exports.apply = apply;
exports.callAll = callAll;
exports.equalityDeep = equalityDeep;
exports.equalityFlat = equalityFlat;
exports.equalityStrict = equalityStrict;
exports.id = id;
exports.is = is;
exports.isArray = isArray;
exports.isNumber = isNumber;
exports.isOneOf = isOneOf;
exports.isString = isString;
exports.isTemplate = isTemplate;
exports.nop = nop;
//# sourceMappingURL=function-314580f7.cjs.map
