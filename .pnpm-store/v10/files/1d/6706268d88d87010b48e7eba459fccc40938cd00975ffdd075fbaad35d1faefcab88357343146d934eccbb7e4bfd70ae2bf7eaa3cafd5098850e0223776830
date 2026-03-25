'use strict'

const { Writable } = require('node:stream')
const { EventEmitter } = require('node:events')
const { assertCacheKey, assertCacheValue } = require('../util/cache.js')

/**
 * @typedef {import('../../types/cache-interceptor.d.ts').default.CacheKey} CacheKey
 * @typedef {import('../../types/cache-interceptor.d.ts').default.CacheValue} CacheValue
 * @typedef {import('../../types/cache-interceptor.d.ts').default.CacheStore} CacheStore
 * @typedef {import('../../types/cache-interceptor.d.ts').default.GetResult} GetResult
 */

/**
 * @implements {CacheStore}
 * @extends {EventEmitter}
 */
class MemoryCacheStore extends EventEmitter {
  #maxCount = 1024
  #maxSize = 104857600 // 100MB
  #maxEntrySize = 5242880 // 5MB

  #size = 0
  #count = 0
  #entries = new Map()
  #hasEmittedMaxSizeEvent = false

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.MemoryCacheStoreOpts | undefined} [opts]
   */
  constructor (opts) {
    super()
    if (opts) {
      if (typeof opts !== 'object') {
        throw new TypeError('MemoryCacheStore options must be an object')
      }

      if (opts.maxCount !== undefined) {
        if (
          typeof opts.maxCount !== 'number' ||
          !Number.isInteger(opts.maxCount) ||
          opts.maxCount < 0
        ) {
          throw new TypeError('MemoryCacheStore options.maxCount must be a non-negative integer')
        }
        this.#maxCount = opts.maxCount
      }

      if (opts.maxSize !== undefined) {
        if (
          typeof opts.maxSize !== 'number' ||
          !Number.isInteger(opts.maxSize) ||
          opts.maxSize < 0
        ) {
          throw new TypeError('MemoryCacheStore options.maxSize must be a non-negative integer')
        }
        this.#maxSize = opts.maxSize
      }

      if (opts.maxEntrySize !== undefined) {
        if (
          typeof opts.maxEntrySize !== 'number' ||
          !Number.isInteger(opts.maxEntrySize) ||
          opts.maxEntrySize < 0
        ) {
          throw new TypeError('MemoryCacheStore options.maxEntrySize must be a non-negative integer')
        }
        this.#maxEntrySize = opts.maxEntrySize
      }
    }
  }

  /**
   * Get the current size of the cache in bytes
   * @returns {number} The current size of the cache in bytes
   */
  get size () {
    return this.#size
  }

  /**
   * Check if the cache is full (either max size or max count reached)
   * @returns {boolean} True if the cache is full, false otherwise
   */
  isFull () {
    return this.#size >= this.#maxSize || this.#count >= this.#maxCount
  }

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} req
   * @returns {import('../../types/cache-interceptor.d.ts').default.GetResult | undefined}
   */
  get (key) {
    assertCacheKey(key)

    const topLevelKey = `${key.origin}:${key.path}`

    const now = Date.now()
    const entries = this.#entries.get(topLevelKey)

    const entry = entries ? findEntry(key, entries, now) : null

    return entry == null
      ? undefined
      : {
          statusMessage: entry.statusMessage,
          statusCode: entry.statusCode,
          headers: entry.headers,
          body: entry.body,
          vary: entry.vary ? entry.vary : undefined,
          etag: entry.etag,
          cacheControlDirectives: entry.cacheControlDirectives,
          cachedAt: entry.cachedAt,
          staleAt: entry.staleAt,
          deleteAt: entry.deleteAt
        }
  }

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} key
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheValue} val
   * @returns {Writable | undefined}
   */
  createWriteStream (key, val) {
    assertCacheKey(key)
    assertCacheValue(val)

    const topLevelKey = `${key.origin}:${key.path}`

    const store = this
    const entry = { ...key, ...val, body: [], size: 0 }

    return new Writable({
      write (chunk, encoding, callback) {
        if (typeof chunk === 'string') {
          chunk = Buffer.from(chunk, encoding)
        }

        entry.size += chunk.byteLength

        if (entry.size >= store.#maxEntrySize) {
          this.destroy()
        } else {
          entry.body.push(chunk)
        }

        callback(null)
      },
      final (callback) {
        let entries = store.#entries.get(topLevelKey)
        if (!entries) {
          entries = []
          store.#entries.set(topLevelKey, entries)
        }
        const previousEntry = findEntry(key, entries, Date.now())
        if (previousEntry) {
          const index = entries.indexOf(previousEntry)
          entries.splice(index, 1, entry)
          store.#size -= previousEntry.size
        } else {
          entries.push(entry)
          store.#count += 1
        }

        store.#size += entry.size

        // Check if cache is full and emit event if needed
        if (store.#size > store.#maxSize || store.#count > store.#maxCount) {
          // Emit maxSizeExceeded event if we haven't already
          if (!store.#hasEmittedMaxSizeEvent) {
            store.emit('maxSizeExceeded', {
              size: store.#size,
              maxSize: store.#maxSize,
              count: store.#count,
              maxCount: store.#maxCount
            })
            store.#hasEmittedMaxSizeEvent = true
          }

          // Perform eviction
          for (const [key, entries] of store.#entries) {
            for (const entry of entries.splice(0, entries.length / 2)) {
              store.#size -= entry.size
              store.#count -= 1
            }
            if (entries.length === 0) {
              store.#entries.delete(key)
            }
          }

          // Reset the event flag after eviction
          if (store.#size < store.#maxSize && store.#count < store.#maxCount) {
            store.#hasEmittedMaxSizeEvent = false
          }
        }

        callback(null)
      }
    })
  }

  /**
   * @param {CacheKey} key
   */
  delete (key) {
    if (typeof key !== 'object') {
      throw new TypeError(`expected key to be object, got ${typeof key}`)
    }

    const topLevelKey = `${key.origin}:${key.path}`

    for (const entry of this.#entries.get(topLevelKey) ?? []) {
      this.#size -= entry.size
      this.#count -= 1
    }
    this.#entries.delete(topLevelKey)
  }
}

function findEntry (key, entries, now) {
  return entries.find((entry) => (
    entry.deleteAt > now &&
    entry.method === key.method &&
    (entry.vary == null || Object.keys(entry.vary).every(headerName => {
      if (entry.vary[headerName] === null) {
        return key.headers[headerName] === undefined
      }

      return entry.vary[headerName] === key.headers[headerName]
    }))
  ))
}

module.exports = MemoryCacheStore
