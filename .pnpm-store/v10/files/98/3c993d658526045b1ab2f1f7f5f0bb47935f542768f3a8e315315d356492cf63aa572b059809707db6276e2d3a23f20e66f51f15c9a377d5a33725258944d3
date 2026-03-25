/**
 * Common functions and function call helpers.
 *
 * @module function
 */

import * as array from './array.js'
import * as object from './object.js'
import * as equalityTrait from './trait/equality.js'

/**
 * Calls all functions in `fs` with args. Only throws after all functions were called.
 *
 * @param {Array<function>} fs
 * @param {Array<any>} args
 */
export const callAll = (fs, args, i = 0) => {
  try {
    for (; i < fs.length; i++) {
      fs[i](...args)
    }
  } finally {
    if (i < fs.length) {
      callAll(fs, args, i + 1)
    }
  }
}

export const nop = () => {}

/**
 * @template T
 * @param {function():T} f
 * @return {T}
 */
export const apply = f => f()

/**
 * @template A
 *
 * @param {A} a
 * @return {A}
 */
export const id = a => a

/**
 * @template T
 *
 * @param {T} a
 * @param {T} b
 * @return {boolean}
 */
export const equalityStrict = (a, b) => a === b

/**
 * @template T
 *
 * @param {Array<T>|object} a
 * @param {Array<T>|object} b
 * @return {boolean}
 */
export const equalityFlat = (a, b) => a === b || (a != null && b != null && a.constructor === b.constructor && ((array.isArray(a) && array.equalFlat(a, /** @type {Array<T>} */ (b))) || (typeof a === 'object' && object.equalFlat(a, b))))

/* c8 ignore start */

/**
 * @param {any} a
 * @param {any} b
 * @return {boolean}
 */
export const equalityDeep = (a, b) => {
  if (a === b) {
    return true
  }
  if (a == null || b == null || (a.constructor !== b.constructor && (a.constructor || Object) !== (b.constructor || Object))) {
    return false
  }
  if (a[equalityTrait.EqualityTraitSymbol] != null) {
    return a[equalityTrait.EqualityTraitSymbol](b)
  }
  switch (a.constructor) {
    case ArrayBuffer:
      a = new Uint8Array(a)
      b = new Uint8Array(b)
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
}

/**
 * @template V
 * @template {V} OPTS
 *
 * @param {V} value
 * @param {Array<OPTS>} options
 */
// @ts-ignore
export const isOneOf = (value, options) => options.includes(value)
/* c8 ignore stop */

export const isArray = array.isArray

/**
 * @param {any} s
 * @return {s is String}
 */
export const isString = (s) => s && s.constructor === String

/**
 * @param {any} n
 * @return {n is Number}
 */
export const isNumber = n => n != null && n.constructor === Number

/**
 * @template {abstract new (...args: any) => any} TYPE
 * @param {any} n
 * @param {TYPE} T
 * @return {n is InstanceType<TYPE>}
 */
export const is = (n, T) => n && n.constructor === T

/**
 * @template {abstract new (...args: any) => any} TYPE
 * @param {TYPE} T
 */
export const isTemplate = (T) =>
  /**
   * @param {any} n
   * @return {n is InstanceType<TYPE>}
   **/
  n => n && n.constructor === T
