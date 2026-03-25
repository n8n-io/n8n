'use strict';

var equality = require('./equality.cjs');

/**
 * Utility functions for working with EcmaScript objects.
 *
 * @module object
 */

/**
 * @return {Object<string,any>} obj
 */
const create = () => Object.create(null);

/**
 * @param {any} o
 * @return {o is { [k:string]:any }}
 */
const isObject = o => typeof o === 'object';

/**
 * Object.assign
 */
const assign = Object.assign;

/**
 * @param {Object<string,any>} obj
 */
const keys = Object.keys;

/**
 * @template V
 * @param {{[key:string]: V}} obj
 * @return {Array<V>}
 */
const values = Object.values;

/**
 * @template V
 * @param {{[k:string]:V}} obj
 * @param {function(V,string):any} f
 */
const forEach = (obj, f) => {
  for (const key in obj) {
    f(obj[key], key);
  }
};

/**
 * @todo implement mapToArray & map
 *
 * @template R
 * @param {Object<string,any>} obj
 * @param {function(any,string):R} f
 * @return {Array<R>}
 */
const map = (obj, f) => {
  const results = [];
  for (const key in obj) {
    results.push(f(obj[key], key));
  }
  return results
};

/**
 * @deprecated use object.size instead
 * @param {Object<string,any>} obj
 * @return {number}
 */
const length = obj => keys(obj).length;

/**
 * @param {Object<string,any>} obj
 * @return {number}
 */
const size = obj => keys(obj).length;

/**
 * @template {{ [key:string|number|symbol]: any }} T
 * @param {T} obj
 * @param {(v:T[keyof T],k:keyof T)=>boolean} f
 * @return {boolean}
 */
const some = (obj, f) => {
  for (const key in obj) {
    if (f(obj[key], key)) {
      return true
    }
  }
  return false
};

/**
 * @param {Object|null|undefined} obj
 */
const isEmpty = obj => {
  // eslint-disable-next-line no-unreachable-loop
  for (const _k in obj) {
    return false
  }
  return true
};

/**
 * @template {{ [key:string|number|symbol]: any }} T
 * @param {T} obj
 * @param {(v:T[keyof T],k:keyof T)=>boolean} f
 * @return {boolean}
 */
const every = (obj, f) => {
  for (const key in obj) {
    if (!f(obj[key], key)) {
      return false
    }
  }
  return true
};

/**
 * Calls `Object.prototype.hasOwnProperty`.
 *
 * @param {any} obj
 * @param {string|number|symbol} key
 * @return {boolean}
 */
const hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * @param {Object<string,any>} a
 * @param {Object<string,any>} b
 * @return {boolean}
 */
const equalFlat = (a, b) => a === b || (size(a) === size(b) && every(a, (val, key) => (val !== undefined || hasProperty(b, key)) && equality.equals(b[key], val)));

/**
 * Make an object immutable. This hurts performance and is usually not needed if you perform good
 * coding practices.
 */
const freeze = Object.freeze;

/**
 * Make an object and all its children immutable.
 * This *really* hurts performance and is usually not needed if you perform good coding practices.
 *
 * @template {any} T
 * @param {T} o
 * @return {Readonly<T>}
 */
const deepFreeze = (o) => {
  for (const key in o) {
    const c = o[key];
    if (typeof c === 'object' || typeof c === 'function') {
      deepFreeze(o[key]);
    }
  }
  return freeze(o)
};

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
const setIfUndefined = (o, key, createT) => hasProperty(o, key) ? o[key] : (o[key] = createT());

var object = /*#__PURE__*/Object.freeze({
  __proto__: null,
  create: create,
  isObject: isObject,
  assign: assign,
  keys: keys,
  values: values,
  forEach: forEach,
  map: map,
  length: length,
  size: size,
  some: some,
  isEmpty: isEmpty,
  every: every,
  hasProperty: hasProperty,
  equalFlat: equalFlat,
  freeze: freeze,
  deepFreeze: deepFreeze,
  setIfUndefined: setIfUndefined
});

exports.assign = assign;
exports.create = create;
exports.deepFreeze = deepFreeze;
exports.equalFlat = equalFlat;
exports.every = every;
exports.forEach = forEach;
exports.freeze = freeze;
exports.hasProperty = hasProperty;
exports.isEmpty = isEmpty;
exports.isObject = isObject;
exports.keys = keys;
exports.length = length;
exports.map = map;
exports.object = object;
exports.setIfUndefined = setIfUndefined;
exports.size = size;
exports.some = some;
exports.values = values;
//# sourceMappingURL=object-c0c9435b.cjs.map
