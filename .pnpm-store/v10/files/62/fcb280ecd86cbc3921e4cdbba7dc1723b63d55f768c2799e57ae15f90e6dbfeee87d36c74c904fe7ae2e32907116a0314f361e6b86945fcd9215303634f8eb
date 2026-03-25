'use strict'

const LRU = require('lru-cache')

const MAX_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_AGE = 3 * 60 * 1000

const MEMOIZED = new LRU({
  max: MAX_SIZE,
  maxAge: MAX_AGE,
  length: (entry, key) => key.startsWith('key:') ? entry.data.length : entry.length,
})

module.exports.clearMemoized = clearMemoized

function clearMemoized () {
  const old = {}
  MEMOIZED.forEach((v, k) => {
    old[k] = v
  })
  MEMOIZED.reset()
  return old
}

module.exports.put = put

function put (cache, entry, data, opts) {
  pickMem(opts).set(`key:${cache}:${entry.key}`, { entry, data })
  putDigest(cache, entry.integrity, data, opts)
}

module.exports.put.byDigest = putDigest

function putDigest (cache, integrity, data, opts) {
  pickMem(opts).set(`digest:${cache}:${integrity}`, data)
}

module.exports.get = get

function get (cache, key, opts) {
  return pickMem(opts).get(`key:${cache}:${key}`)
}

module.exports.get.byDigest = getDigest

function getDigest (cache, integrity, opts) {
  return pickMem(opts).get(`digest:${cache}:${integrity}`)
}

class ObjProxy {
  constructor (obj) {
    this.obj = obj
  }

  get (key) {
    return this.obj[key]
  }

  set (key, val) {
    this.obj[key] = val
  }
}

function pickMem (opts) {
  if (!opts || !opts.memoize)
    return MEMOIZED
  else if (opts.memoize.get && opts.memoize.set)
    return opts.memoize
  else if (typeof opts.memoize === 'object')
    return new ObjProxy(opts.memoize)
  else
    return MEMOIZED
}
