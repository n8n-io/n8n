'use strict'

const { safe } = require('./safe-format')

const caches = new WeakMap()

// Given a scope object, generates new symbol/loop/pattern/format/ref variable names,
// also stores in-scope format/ref mapping to variable names

const scopeMethods = (scope) => {
  // cache meta info for known scope variables, per meta type
  if (!caches.has(scope))
    caches.set(scope, { sym: new Map(), ref: new Map(), format: new Map(), pattern: new Map() })
  const cache = caches.get(scope)

  // Generic variable names, requires a base name aka prefix
  const gensym = (name) => {
    if (!cache.sym.get(name)) cache.sym.set(name, 0)
    const index = cache.sym.get(name)
    cache.sym.set(name, index + 1)
    return safe(`${name}${index}`)
  }

  // Regexp pattern names
  const genpattern = (p) => {
    if (cache.pattern.has(p)) return cache.pattern.get(p)
    const n = gensym('pattern')
    scope[n] = new RegExp(p, 'u')
    cache.pattern.set(p, n)
    return n
  }

  // Loop variable names
  if (!cache.loop) cache.loop = 'ijklmnopqrstuvxyz'.split('')
  const genloop = () => {
    const v = cache.loop.shift()
    cache.loop.push(`${v}${v[0]}`)
    return safe(v)
  }

  // Reference (validator function) names
  const getref = (sub) => cache.ref.get(sub)
  const genref = (sub) => {
    const n = gensym('ref')
    cache.ref.set(sub, n)
    return n
  }

  // Format validation function names
  const genformat = (impl) => {
    let n = cache.format.get(impl)
    if (!n) {
      n = gensym('format')
      scope[n] = impl
      cache.format.set(impl, n)
    }
    return n
  }

  return { gensym, genpattern, genloop, getref, genref, genformat }
}

module.exports = { scopeMethods }
