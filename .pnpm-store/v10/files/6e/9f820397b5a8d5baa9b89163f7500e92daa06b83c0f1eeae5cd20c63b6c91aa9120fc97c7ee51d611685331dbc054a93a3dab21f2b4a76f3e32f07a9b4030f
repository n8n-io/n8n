'use strict'

// for correct Unicode code points processing
// https://mathiasbynens.be/notes/javascript-unicode#accounting-for-astral-symbols
const stringLength = (string) =>
  /[\uD800-\uDFFF]/.test(string) ? [...string].length : string.length

// A isMultipleOf B: shortest decimal denoted as A % shortest decimal denoted as B === 0
// Optimized, coherence checks and precomputation are outside of this method
// If we get an Infinity when we multiply by the factor (which is always a power of 10), we just undo that instead of always returning false
const isMultipleOf = (value, divisor, factor, factorMultiple) => {
  if (value % divisor === 0) return true
  let multiple = value * factor
  if (multiple === Infinity || multiple === -Infinity) multiple = value
  if (multiple % factorMultiple === 0) return true
  const normal = Math.floor(multiple + 0.5)
  return normal / factor === value && normal % factorMultiple === 0
}

// supports only JSON-stringifyable objects, defaults to false for unsupported
// also uses ===, not Object.is, i.e. 0 === -0, NaN !== NaN
// symbols and non-enumerable properties are ignored!
const deepEqual = (obj, obj2) => {
  if (obj === obj2) return true
  if (!obj || !obj2 || typeof obj !== typeof obj2) return false
  if (obj !== obj2 && typeof obj !== 'object') return false

  const proto = Object.getPrototypeOf(obj)
  if (proto !== Object.getPrototypeOf(obj2)) return false

  if (proto === Array.prototype) {
    if (!Array.isArray(obj) || !Array.isArray(obj2)) return false
    if (obj.length !== obj2.length) return false
    return obj.every((x, i) => deepEqual(x, obj2[i]))
  } else if (proto === Object.prototype) {
    const [keys, keys2] = [Object.keys(obj), Object.keys(obj2)]
    if (keys.length !== keys2.length) return false
    const keyset2 = new Set([...keys, ...keys2])
    return keyset2.size === keys.length && keys.every((key) => deepEqual(obj[key], obj2[key]))
  }
  return false
}

const unique = (array) => {
  if (array.length < 2) return true
  if (array.length === 2) return !deepEqual(array[0], array[1])
  const objects = []
  const primitives = array.length > 20 ? new Set() : null
  let primitivesCount = 0
  let pos = 0
  for (const item of array) {
    if (typeof item === 'object') {
      objects.push(item)
    } else if (primitives) {
      primitives.add(item)
      if (primitives.size !== ++primitivesCount) return false
    } else {
      if (array.indexOf(item, pos + 1) !== -1) return false
    }
    pos++
  }
  for (let i = 1; i < objects.length; i++)
    for (let j = 0; j < i; j++) if (deepEqual(objects[i], objects[j])) return false
  return true
}

const deBase64 = (string) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(string, 'base64').toString('utf-8')
  const b = atob(string)
  return new TextDecoder('utf-8').decode(new Uint8Array(b.length).map((_, i) => b.charCodeAt(i)))
}

const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty)
// special handling for stringification
hasOwn[Symbol.for('toJayString')] = 'Function.prototype.call.bind(Object.prototype.hasOwnProperty)'

// Used for error generation. Affects error performance, optimized
const pointerPart = (s) => (/~\//.test(s) ? `${s}`.replace(/~/g, '~0').replace(/\//g, '~1') : s)
const toPointer = (path) => (path.length === 0 ? '#' : `#/${path.map(pointerPart).join('/')}`)

const errorMerge = ({ keywordLocation, instanceLocation }, schemaBase, dataBase) => ({
  keywordLocation: `${schemaBase}${keywordLocation.slice(1)}`,
  instanceLocation: `${dataBase}${instanceLocation.slice(1)}`,
})

const propertyIn = (key, [properties, patterns]) =>
  properties.includes(true) ||
  properties.some((prop) => prop === key) ||
  patterns.some((pattern) => new RegExp(pattern, 'u').test(key))

// id is verified to start with '#' at compile time, hence using plain objects is safe
const dynamicResolve = (anchors, id) => (anchors.filter((x) => x[id])[0] || {})[id]

const extraUtils = { toPointer, pointerPart, errorMerge, propertyIn, dynamicResolve }
module.exports = { stringLength, isMultipleOf, deepEqual, unique, deBase64, hasOwn, ...extraUtils }
