'use strict'

const { Cache } = require('./cache')
const { webidl } = require('../webidl')
const { kEnumerableProperty } = require('../../core/util')
const { kConstruct } = require('../../core/symbols')

class CacheStorage {
  /**
   * @see https://w3c.github.io/ServiceWorker/#dfn-relevant-name-to-cache-map
   * @type {Map<string, import('./cache').requestResponseList}
   */
  #caches = new Map()

  constructor () {
    if (arguments[0] !== kConstruct) {
      webidl.illegalConstructor()
    }

    webidl.util.markAsUncloneable(this)
  }

  async match (request, options = {}) {
    webidl.brandCheck(this, CacheStorage)
    webidl.argumentLengthCheck(arguments, 1, 'CacheStorage.match')

    request = webidl.converters.RequestInfo(request)
    options = webidl.converters.MultiCacheQueryOptions(options)

    // 1.
    if (options.cacheName != null) {
      // 1.1.1.1
      if (this.#caches.has(options.cacheName)) {
        // 1.1.1.1.1
        const cacheList = this.#caches.get(options.cacheName)
        const cache = new Cache(kConstruct, cacheList)

        return await cache.match(request, options)
      }
    } else { // 2.
      // 2.2
      for (const cacheList of this.#caches.values()) {
        const cache = new Cache(kConstruct, cacheList)

        // 2.2.1.2
        const response = await cache.match(request, options)

        if (response !== undefined) {
          return response
        }
      }
    }
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-storage-has
   * @param {string} cacheName
   * @returns {Promise<boolean>}
   */
  async has (cacheName) {
    webidl.brandCheck(this, CacheStorage)

    const prefix = 'CacheStorage.has'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    cacheName = webidl.converters.DOMString(cacheName, prefix, 'cacheName')

    // 2.1.1
    // 2.2
    return this.#caches.has(cacheName)
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#dom-cachestorage-open
   * @param {string} cacheName
   * @returns {Promise<Cache>}
   */
  async open (cacheName) {
    webidl.brandCheck(this, CacheStorage)

    const prefix = 'CacheStorage.open'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    cacheName = webidl.converters.DOMString(cacheName, prefix, 'cacheName')

    // 2.1
    if (this.#caches.has(cacheName)) {
      // await caches.open('v1') !== await caches.open('v1')

      // 2.1.1
      const cache = this.#caches.get(cacheName)

      // 2.1.1.1
      return new Cache(kConstruct, cache)
    }

    // 2.2
    const cache = []

    // 2.3
    this.#caches.set(cacheName, cache)

    // 2.4
    return new Cache(kConstruct, cache)
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-storage-delete
   * @param {string} cacheName
   * @returns {Promise<boolean>}
   */
  async delete (cacheName) {
    webidl.brandCheck(this, CacheStorage)

    const prefix = 'CacheStorage.delete'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    cacheName = webidl.converters.DOMString(cacheName, prefix, 'cacheName')

    return this.#caches.delete(cacheName)
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-storage-keys
   * @returns {Promise<string[]>}
   */
  async keys () {
    webidl.brandCheck(this, CacheStorage)

    // 2.1
    const keys = this.#caches.keys()

    // 2.2
    return [...keys]
  }
}

Object.defineProperties(CacheStorage.prototype, {
  [Symbol.toStringTag]: {
    value: 'CacheStorage',
    configurable: true
  },
  match: kEnumerableProperty,
  has: kEnumerableProperty,
  open: kEnumerableProperty,
  delete: kEnumerableProperty,
  keys: kEnumerableProperty
})

module.exports = {
  CacheStorage
}
