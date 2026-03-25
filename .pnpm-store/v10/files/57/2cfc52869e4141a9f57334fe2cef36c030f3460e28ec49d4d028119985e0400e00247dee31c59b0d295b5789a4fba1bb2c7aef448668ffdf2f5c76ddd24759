import * as equalityTrait from './trait/equality.js'

/**
 * Utility functions for working with EcmaScript objects.
 *
 * @module object
 */

/**
 * @return {Object<string,any>} obj
 */
export const create = () => Object.create(null)

/**
 * @param {any} o
 * @return {o is { [k:string]:any }}
 */
export const isObject = o => typeof o === 'object'

/**
 * Object.assign
 */
export const assign = Object.assign

/**
 * @param {Object<string,any>} obj
 */
export const keys = Object.keys

/**
 * @template V
 * @param {{[key:string]: V}} obj
 * @return {Array<V>}
 */
export const values = Object.values

/**
 * @template V
 * @param {{[k:string]:V}} obj
 * @param {function(V,string):any} f
 */
export const forEach = (obj, f) => {
  for (const key in obj) {
    f(obj[key], key)
  }
}

/**
 * @todo implement mapToArray & map
 *
 * @template R
 * @param {Object<string,any>} obj
 * @param {function(any,string):R} f
 * @return {Array<R>}
 */
export const map = (obj, f) => {
  const results = []
  for (const key in obj) {
    results.push(f(obj[key], key))
  }
  return results
}

/**
 * @deprecated use object.size instead
 * @param {Object<string,any>} obj
 * @return {number}
 */
export const length = obj => keys(obj).length

/**
 * @param {Object<string,any>} obj
 * @return {number}
 */
export const size = obj => keys(obj).length

/**
 * @template {{ [key:string|number|symbol]: any }} T
 * @param {T} obj
 * @param {(v:T[keyof T],k:keyof T)=>boolean} f
 * @return {boolean}
 */
export const some = (obj, f) => {
  for (const key in obj) {
    if (f(obj[key], key)) {
      return true
    }
  }
  return false
}

/**
 * @param {Object|null|undefined} obj
 */
export const isEmpty = obj => {
  // eslint-disable-next-line no-unreachable-loop
  for (const _k in obj) {
    return false
  }
  return true
}

/**
 * @template {{ [key:string|number|symbol]: any }} T
 * @param {T} obj
 * @param {(v:T[keyof T],k:keyof T)=>boolean} f
 * @return {boolean}
 */
export const every = (obj, f) => {
  for (const key in obj) {
    if (!f(obj[key], key)) {
      return false
    }
  }
  return true
}

/**
 * Calls `Object.prototype.hasOwnProperty`.
 *
 * @param {any} obj
 * @param {string|number|symbol} key
 * @return {boolean}
 */
export const hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

/**
 * @param {Object<string,any>} a
 * @param {Object<string,any>} b
 * @return {boolean}
 */
export const equalFlat = (a, b) => a === b || (size(a) === size(b) && every(a, (val, key) => (val !== undefined || hasProperty(b, key)) && equalityTrait.equals(b[key], val)))

/**
 * Make an object immutable. This hurts performance and is usually not needed if you perform good
 * coding practices.
 */
export const freeze = Object.freeze

/**
 * Make an object and all its children immutable.
 * This *really* hurts performance and is usually not needed if you perform good coding practices.
 *
 * @template {any} T
 * @param {T} o
 * @return {Readonly<T>}
 */
export const deepFreeze = (o) => {
  for (const key in o) {
    const c = o[key]
    if (typeof c === 'object' || typeof c === 'function') {
      deepFreeze(o[key])
    }
  }
  return freeze(o)
}

/**
 * Get object property. Create T if property is undefined and set T on object.
 *
 * @function
 * @template {object} KV
 * @template {keyof KV} [K=keyof KV]
 * @param {KV} o
 * @param {K} key
 * @param {() => KV[K]} createT
 * @return {KV[K]}
 */
export const setIfUndefined = (o, key, createT) => hasProperty(o, key) ? o[key] : (o[key] = createT())
