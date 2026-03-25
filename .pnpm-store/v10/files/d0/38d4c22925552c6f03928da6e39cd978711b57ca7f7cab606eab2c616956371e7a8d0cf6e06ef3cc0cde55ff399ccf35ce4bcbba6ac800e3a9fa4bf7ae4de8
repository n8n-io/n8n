'use strict'

class SafeString extends String {} // used for instanceof checks

const compares = new Set(['<', '>', '<=', '>='])
const escapeCode = (code) => `\\u${code.toString(16).padStart(4, '0')}`

// Supports simple js variables only, i.e. constants and JSON-stringifiable
// Converts a variable to be safe for inclusion in JS context
// This works on top of JSON.stringify with minor fixes to negate the JS/JSON parsing differences
const jsval = (val) => {
  if ([Infinity, -Infinity, NaN, undefined, null].includes(val)) return `${val}`
  const primitive = ['string', 'boolean', 'number'].includes(typeof val)
  if (!primitive) {
    if (typeof val !== 'object') throw new Error('Unexpected value type')
    const proto = Object.getPrototypeOf(val)
    const ok = (proto === Array.prototype && Array.isArray(val)) || proto === Object.prototype
    if (!ok) throw new Error('Unexpected object given as value')
  }
  return (
    JSON.stringify(val)
      // JSON context and JS eval context have different handling of __proto__ property name
      // Refs: https://www.ecma-international.org/ecma-262/#sec-json.parse
      // Refs: https://www.ecma-international.org/ecma-262/#sec-__proto__-property-names-in-object-initializers
      // Replacement is safe because it's the only way that encodes __proto__ property in JSON and
      // it can't occur inside strings or other properties, due to the leading `"` and traling `":`
      .replace(/([{,])"__proto__":/g, '$1["__proto__"]:')
      // The above line should cover all `"__proto__":` occurances except for `"...\"__proto__":`
      .replace(/[^\\]"__proto__":/g, () => {
        /* c8 ignore next */
        throw new Error('Unreachable')
      })
      // https://v8.dev/features/subsume-json#security, e.g. {'\u2028':0} on Node.js 8
      .replace(/[\u2028\u2029]/g, (char) => escapeCode(char.charCodeAt(0)))
  )
}

const format = (fmt, ...args) => {
  const res = fmt.replace(/%[%drscjw]/g, (match) => {
    if (match === '%%') return '%'
    if (args.length === 0) throw new Error('Unexpected arguments count')
    const val = args.shift()
    switch (match) {
      case '%d':
        if (typeof val === 'number') return val
        throw new Error('Expected a number')
      case '%r':
        // String(regex) is not ok on Node.js 10 and below: console.log(String(new RegExp('\n')))
        if (val instanceof RegExp) return format('new RegExp(%j, %j)', val.source, val.flags)
        throw new Error('Expected a RegExp instance')
      case '%s':
        if (val instanceof SafeString) return val
        throw new Error('Expected a safe string')
      case '%c':
        if (compares.has(val)) return val
        throw new Error('Expected a compare op')
      case '%j':
        return jsval(val)
      case '%w':
        if (Number.isInteger(val) && val >= 0) return ' '.repeat(val)
        throw new Error('Expected a non-negative integer for indentation')
    }
    /* c8 ignore next */
    throw new Error('Unreachable')
  })
  if (args.length !== 0) throw new Error('Unexpected arguments count')
  return new SafeString(res)
}

const safe = (string) => {
  if (!/^[a-z][a-z0-9_]*$/i.test(string)) throw new Error('Does not look like a safe id')
  return new SafeString(string)
}

// too dangereous to export, use with care
const safewrap = (fun) => (...args) => {
  if (!args.every((arg) => arg instanceof SafeString)) throw new Error('Unsafe arguments')
  return new SafeString(fun(...args))
}

const safepriority = (arg) =>
  // simple expression and single brackets can not break priority
  /^[a-z][a-z0-9_().]*$/i.test(arg) || /^\([^()]+\)$/i.test(arg) ? arg : format('(%s)', arg)
const safeor = safewrap(
  (...args) => (args.some((arg) => `${arg}` === 'true') ? 'true' : args.join(' || ') || 'false')
)
const safeand = safewrap(
  (...args) => (args.some((arg) => `${arg}` === 'false') ? 'false' : args.join(' && ') || 'true')
)
const safenot = (arg) => {
  if (`${arg}` === 'true') return safe('false')
  if (`${arg}` === 'false') return safe('true')
  return format('!%s', safepriority(arg))
}
// this function is priority-safe, unlike safeor, hence it's exported and safeor is not atm
const safenotor = (...args) => safenot(safeor(...args))

module.exports = { format, safe, safeand, safenot, safenotor }
