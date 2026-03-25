'use strict'

const { format, safe } = require('./safe-format')
const { scopeMethods } = require('./scope-utils')
const functions = require('./scope-functions')

// for building into the validation function
const types = new Map(
  Object.entries({
    null: (name) => format('%s === null', name),
    boolean: (name) => format('typeof %s === "boolean"', name),
    array: (name) => format('Array.isArray(%s)', name),
    object: (n) => format('typeof %s === "object" && %s && !Array.isArray(%s)', n, n, n),
    number: (name) => format('typeof %s === "number"', name),
    integer: (name) => format('Number.isInteger(%s)', name),
    string: (name) => format('typeof %s === "string"', name),
  })
)

const buildName = ({ name, parent, keyval, keyname }) => {
  if (name) {
    if (parent || keyval || keyname) throw new Error('name can be used only stand-alone')
    return name // top-level
  }
  if (!parent) throw new Error('Can not use property of undefined parent!')
  const parentName = buildName(parent)
  if (keyval !== undefined) {
    if (keyname) throw new Error('Can not use key value and name together')
    if (!['string', 'number'].includes(typeof keyval)) throw new Error('Invalid property path')
    if (/^[a-z][a-z0-9_]*$/i.test(keyval)) return format('%s.%s', parentName, safe(keyval))
    return format('%s[%j]', parentName, keyval)
  } else if (keyname) {
    return format('%s[%s]', parentName, keyname)
  }
  /* c8 ignore next */
  throw new Error('Unreachable')
}

const jsonProtoKeys = new Set(
  [].concat(
    ...[Object, Array, String, Number, Boolean].map((c) => Object.getOwnPropertyNames(c.prototype))
  )
)

const jsHelpers = (fun, scope, propvar, { unmodifiedPrototypes, isJSON }, noopRegExps) => {
  const { gensym, genpattern, genloop } = scopeMethods(scope, propvar)

  const present = (obj) => {
    const name = buildName(obj) // also checks for coherence, do not remove
    const { parent, keyval, keyname, inKeys, checked } = obj
    /* c8 ignore next */
    if (checked || (inKeys && isJSON)) throw new Error('Unreachable: useless check for undefined')
    if (inKeys) return format('%s !== undefined', name)
    if (parent && keyname) {
      scope.hasOwn = functions.hasOwn
      const pname = buildName(parent)
      if (isJSON) return format('%s !== undefined && hasOwn(%s, %s)', name, pname, keyname)
      return format('%s in %s && hasOwn(%s, %s)', keyname, pname, pname, keyname)
    } else if (parent && keyval !== undefined) {
      // numbers must be converted to strings for this check, hence `${keyval}` in check below
      if (unmodifiedPrototypes && isJSON && !jsonProtoKeys.has(`${keyval}`))
        return format('%s !== undefined', name)
      scope.hasOwn = functions.hasOwn
      const pname = buildName(parent)
      if (isJSON) return format('%s !== undefined && hasOwn(%s, %j)', name, pname, keyval)
      return format('%j in %s && hasOwn(%s, %j)', keyval, pname, pname, keyval)
    }
    /* c8 ignore next */
    throw new Error('Unreachable: present() check without parent')
  }

  const forObjectKeys = (obj, writeBody) => {
    const key = gensym('key')
    fun.block(format('for (const %s of Object.keys(%s))', key, buildName(obj)), () => {
      writeBody(propvar(obj, key, true), key) // always own property here
    })
  }

  const forArray = (obj, start, writeBody) => {
    const i = genloop()
    const name = buildName(obj)
    fun.block(format('for (let %s = %s; %s < %s.length; %s++)', i, start, i, name, i), () => {
      writeBody(propvar(obj, i, unmodifiedPrototypes, true), i) // own property in Array if proto not mangled
    })
  }

  const patternTest = (pat, key) => {
    // Convert common patterns to string checks, makes generated code easier to read (and a tiny perf bump)
    const r = pat.replace(/[.^$|*+?(){}[\]\\]/gu, '') // Special symbols: .^$|*+?(){}[]\
    if (pat === `^${r}$`) return format('(%s === %j)', key, pat.slice(1, -1)) // ^abc$ -> === abc
    if (noopRegExps.has(pat)) return format('true') // known noop

    // All of the below will cause warnings in enforced string validation mode, but let's make what they actually do more visible
    // note that /^.*$/u.test('\n') is false, so don't combine .* with anchors here!
    if ([r, `${r}+`, `${r}.*`, `.*${r}.*`].includes(pat)) return format('%s.includes(%j)', key, r)
    if ([`^${r}`, `^${r}+`, `^${r}.*`].includes(pat)) return format('%s.startsWith(%j)', key, r)
    if ([`${r}$`, `.*${r}$`].includes(pat)) return format('%s.endsWith(%j)', key, r)

    const subr = [...r].slice(0, -1).join('') // without the last symbol, astral plane aware
    if ([`${r}*`, `${r}?`].includes(pat))
      return subr.length === 0 ? format('true') : format('%s.includes(%j)', key, subr) // abc*, abc? -> includes(ab)
    if ([`^${r}*`, `^${r}?`].includes(pat))
      return subr.length === 0 ? format('true') : format('%s.startsWith(%j)', key, subr) // ^abc*, ^abc? -> startsWith(ab)

    // A normal reg-exp test
    return format('%s.test(%s)', genpattern(pat), key)
  }

  const compare = (name, val) => {
    if (!val || typeof val !== 'object') return format('%s === %j', name, val)

    let type // type is needed for speedup only, deepEqual rechecks that
    // small plain object/arrays are fast cases and we inline those instead of calling deepEqual
    const shouldInline = (arr) => arr.length <= 3 && arr.every((x) => !x || typeof x !== 'object')
    if (Array.isArray(val)) {
      type = types.get('array')(name)
      if (shouldInline(val)) {
        let k = format('%s.length === %d', name, val.length)
        for (let i = 0; i < val.length; i++) k = format('%s && %s[%d] === %j', k, name, i, val[i])
        return format('%s && %s', type, k)
      }
    } else {
      type = types.get('object')(name)
      const [keys, values] = [Object.keys(val), Object.values(val)]
      if (shouldInline(values)) {
        let k = format('Object.keys(%s).length === %d', name, keys.length)
        if (keys.length > 0) scope.hasOwn = functions.hasOwn
        for (const key of keys) k = format('%s && hasOwn(%s, %j)', k, name, key)
        for (const key of keys) k = format('%s && %s[%j] === %j', k, name, key, val[key])
        return format('%s && %s', type, k)
      }
    }

    scope.deepEqual = functions.deepEqual
    return format('%s && deepEqual(%s, %j)', type, name, val)
  }

  return { present, forObjectKeys, forArray, patternTest, compare, propvar }
}

// Stringifcation of functions and regexps, for scope
const isArrowFnWithParensRegex = /^\([^)]*\) *=>/
const isArrowFnWithoutParensRegex = /^[^=]*=>/
const toJayString = Symbol.for('toJayString')
function jaystring(item) {
  if (typeof item === 'function') {
    if (item[toJayString]) return item[toJayString] // this is supported only for functions

    if (Object.getPrototypeOf(item) !== Function.prototype)
      throw new Error('Can not stringify: a function with unexpected prototype')

    const stringified = `${item}`
    if (item.prototype) {
      if (!/^function[ (]/.test(stringified)) throw new Error('Unexpected function')
      return stringified // normal function
    }
    if (isArrowFnWithParensRegex.test(stringified) || isArrowFnWithoutParensRegex.test(stringified))
      return stringified // Arrow function

    // Shortened ES6 object method declaration
    throw new Error('Can not stringify: only either normal or arrow functions are supported')
  } else if (typeof item === 'object') {
    const proto = Object.getPrototypeOf(item)
    if (item instanceof RegExp && proto === RegExp.prototype) return format('%r', item)
    throw new Error('Can not stringify: an object with unexpected prototype')
  }
  throw new Error(`Can not stringify: unknown type ${typeof item}`)
}

module.exports = { types, buildName, jsHelpers, jaystring }
