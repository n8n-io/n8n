'use strict'

const assert = require('node:assert')

const { kConstruct } = require('../../core/symbols')
const { urlEquals, getFieldValues } = require('./util')
const { kEnumerableProperty, isDisturbed } = require('../../core/util')
const { webidl } = require('../webidl')
const { cloneResponse, fromInnerResponse, getResponseState } = require('../fetch/response')
const { Request, fromInnerRequest, getRequestState } = require('../fetch/request')
const { fetching } = require('../fetch/index')
const { urlIsHttpHttpsScheme, readAllBytes } = require('../fetch/util')
const { createDeferredPromise } = require('../../util/promise')

/**
 * @see https://w3c.github.io/ServiceWorker/#dfn-cache-batch-operation
 * @typedef {Object} CacheBatchOperation
 * @property {'delete' | 'put'} type
 * @property {any} request
 * @property {any} response
 * @property {import('../../../types/cache').CacheQueryOptions} options
 */

/**
 * @see https://w3c.github.io/ServiceWorker/#dfn-request-response-list
 * @typedef {[any, any][]} requestResponseList
 */

class Cache {
  /**
   * @see https://w3c.github.io/ServiceWorker/#dfn-relevant-request-response-list
   * @type {requestResponseList}
   */
  #relevantRequestResponseList

  constructor () {
    if (arguments[0] !== kConstruct) {
      webidl.illegalConstructor()
    }

    webidl.util.markAsUncloneable(this)
    this.#relevantRequestResponseList = arguments[1]
  }

  async match (request, options = {}) {
    webidl.brandCheck(this, Cache)

    const prefix = 'Cache.match'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    request = webidl.converters.RequestInfo(request)
    options = webidl.converters.CacheQueryOptions(options, prefix, 'options')

    const p = this.#internalMatchAll(request, options, 1)

    if (p.length === 0) {
      return
    }

    return p[0]
  }

  async matchAll (request = undefined, options = {}) {
    webidl.brandCheck(this, Cache)

    const prefix = 'Cache.matchAll'
    if (request !== undefined) request = webidl.converters.RequestInfo(request)
    options = webidl.converters.CacheQueryOptions(options, prefix, 'options')

    return this.#internalMatchAll(request, options)
  }

  async add (request) {
    webidl.brandCheck(this, Cache)

    const prefix = 'Cache.add'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    request = webidl.converters.RequestInfo(request)

    // 1.
    const requests = [request]

    // 2.
    const responseArrayPromise = this.addAll(requests)

    // 3.
    return await responseArrayPromise
  }

  async addAll (requests) {
    webidl.brandCheck(this, Cache)

    const prefix = 'Cache.addAll'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    // 1.
    const responsePromises = []

    // 2.
    const requestList = []

    // 3.
    for (let request of requests) {
      if (request === undefined) {
        throw webidl.errors.conversionFailed({
          prefix,
          argument: 'Argument 1',
          types: ['undefined is not allowed']
        })
      }

      request = webidl.converters.RequestInfo(request)

      if (typeof request === 'string') {
        continue
      }

      // 3.1
      const r = getRequestState(request)

      // 3.2
      if (!urlIsHttpHttpsScheme(r.url) || r.method !== 'GET') {
        throw webidl.errors.exception({
          header: prefix,
          message: 'Expected http/s scheme when method is not GET.'
        })
      }
    }

    // 4.
    /** @type {ReturnType<typeof fetching>[]} */
    const fetchControllers = []

    // 5.
    for (const request of requests) {
      // 5.1
      const r = getRequestState(new Request(request))

      // 5.2
      if (!urlIsHttpHttpsScheme(r.url)) {
        throw webidl.errors.exception({
          header: prefix,
          message: 'Expected http/s scheme.'
        })
      }

      // 5.4
      r.initiator = 'fetch'
      r.destination = 'subresource'

      // 5.5
      requestList.push(r)

      // 5.6
      const responsePromise = createDeferredPromise()

      // 5.7
      fetchControllers.push(fetching({
        request: r,
        processResponse (response) {
          // 1.
          if (response.type === 'error' || response.status === 206 || response.status < 200 || response.status > 299) {
            responsePromise.reject(webidl.errors.exception({
              header: 'Cache.addAll',
              message: 'Received an invalid status code or the request failed.'
            }))
          } else if (response.headersList.contains('vary')) { // 2.
            // 2.1
            const fieldValues = getFieldValues(response.headersList.get('vary'))

            // 2.2
            for (const fieldValue of fieldValues) {
              // 2.2.1
              if (fieldValue === '*') {
                responsePromise.reject(webidl.errors.exception({
                  header: 'Cache.addAll',
                  message: 'invalid vary field value'
                }))

                for (const controller of fetchControllers) {
                  controller.abort()
                }

                return
              }
            }
          }
        },
        processResponseEndOfBody (response) {
          // 1.
          if (response.aborted) {
            responsePromise.reject(new DOMException('aborted', 'AbortError'))
            return
          }

          // 2.
          responsePromise.resolve(response)
        }
      }))

      // 5.8
      responsePromises.push(responsePromise.promise)
    }

    // 6.
    const p = Promise.all(responsePromises)

    // 7.
    const responses = await p

    // 7.1
    const operations = []

    // 7.2
    let index = 0

    // 7.3
    for (const response of responses) {
      // 7.3.1
      /** @type {CacheBatchOperation} */
      const operation = {
        type: 'put', // 7.3.2
        request: requestList[index], // 7.3.3
        response // 7.3.4
      }

      operations.push(operation) // 7.3.5

      index++ // 7.3.6
    }

    // 7.5
    const cacheJobPromise = createDeferredPromise()

    // 7.6.1
    let errorData = null

    // 7.6.2
    try {
      this.#batchCacheOperations(operations)
    } catch (e) {
      errorData = e
    }

    // 7.6.3
    queueMicrotask(() => {
      // 7.6.3.1
      if (errorData === null) {
        cacheJobPromise.resolve(undefined)
      } else {
        // 7.6.3.2
        cacheJobPromise.reject(errorData)
      }
    })

    // 7.7
    return cacheJobPromise.promise
  }

  async put (request, response) {
    webidl.brandCheck(this, Cache)

    const prefix = 'Cache.put'
    webidl.argumentLengthCheck(arguments, 2, prefix)

    request = webidl.converters.RequestInfo(request)
    response = webidl.converters.Response(response, prefix, 'response')

    // 1.
    let innerRequest = null

    // 2.
    if (webidl.is.Request(request)) {
      innerRequest = getRequestState(request)
    } else { // 3.
      innerRequest = getRequestState(new Request(request))
    }

    // 4.
    if (!urlIsHttpHttpsScheme(innerRequest.url) || innerRequest.method !== 'GET') {
      throw webidl.errors.exception({
        header: prefix,
        message: 'Expected an http/s scheme when method is not GET'
      })
    }

    // 5.
    const innerResponse = getResponseState(response)

    // 6.
    if (innerResponse.status === 206) {
      throw webidl.errors.exception({
        header: prefix,
        message: 'Got 206 status'
      })
    }

    // 7.
    if (innerResponse.headersList.contains('vary')) {
      // 7.1.
      const fieldValues = getFieldValues(innerResponse.headersList.get('vary'))

      // 7.2.
      for (const fieldValue of fieldValues) {
        // 7.2.1
        if (fieldValue === '*') {
          throw webidl.errors.exception({
            header: prefix,
            message: 'Got * vary field value'
          })
        }
      }
    }

    // 8.
    if (innerResponse.body && (isDisturbed(innerResponse.body.stream) || innerResponse.body.stream.locked)) {
      throw webidl.errors.exception({
        header: prefix,
        message: 'Response body is locked or disturbed'
      })
    }

    // 9.
    const clonedResponse = cloneResponse(innerResponse)

    // 10.
    const bodyReadPromise = createDeferredPromise()

    // 11.
    if (innerResponse.body != null) {
      // 11.1
      const stream = innerResponse.body.stream

      // 11.2
      const reader = stream.getReader()

      // 11.3
      readAllBytes(reader, bodyReadPromise.resolve, bodyReadPromise.reject)
    } else {
      bodyReadPromise.resolve(undefined)
    }

    // 12.
    /** @type {CacheBatchOperation[]} */
    const operations = []

    // 13.
    /** @type {CacheBatchOperation} */
    const operation = {
      type: 'put', // 14.
      request: innerRequest, // 15.
      response: clonedResponse // 16.
    }

    // 17.
    operations.push(operation)

    // 19.
    const bytes = await bodyReadPromise.promise

    if (clonedResponse.body != null) {
      clonedResponse.body.source = bytes
    }

    // 19.1
    const cacheJobPromise = createDeferredPromise()

    // 19.2.1
    let errorData = null

    // 19.2.2
    try {
      this.#batchCacheOperations(operations)
    } catch (e) {
      errorData = e
    }

    // 19.2.3
    queueMicrotask(() => {
      // 19.2.3.1
      if (errorData === null) {
        cacheJobPromise.resolve()
      } else { // 19.2.3.2
        cacheJobPromise.reject(errorData)
      }
    })

    return cacheJobPromise.promise
  }

  async delete (request, options = {}) {
    webidl.brandCheck(this, Cache)

    const prefix = 'Cache.delete'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    request = webidl.converters.RequestInfo(request)
    options = webidl.converters.CacheQueryOptions(options, prefix, 'options')

    /**
     * @type {Request}
     */
    let r = null

    if (webidl.is.Request(request)) {
      r = getRequestState(request)

      if (r.method !== 'GET' && !options.ignoreMethod) {
        return false
      }
    } else {
      assert(typeof request === 'string')

      r = getRequestState(new Request(request))
    }

    /** @type {CacheBatchOperation[]} */
    const operations = []

    /** @type {CacheBatchOperation} */
    const operation = {
      type: 'delete',
      request: r,
      options
    }

    operations.push(operation)

    const cacheJobPromise = createDeferredPromise()

    let errorData = null
    let requestResponses

    try {
      requestResponses = this.#batchCacheOperations(operations)
    } catch (e) {
      errorData = e
    }

    queueMicrotask(() => {
      if (errorData === null) {
        cacheJobPromise.resolve(!!requestResponses?.length)
      } else {
        cacheJobPromise.reject(errorData)
      }
    })

    return cacheJobPromise.promise
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#dom-cache-keys
   * @param {any} request
   * @param {import('../../../types/cache').CacheQueryOptions} options
   * @returns {Promise<readonly Request[]>}
   */
  async keys (request = undefined, options = {}) {
    webidl.brandCheck(this, Cache)

    const prefix = 'Cache.keys'

    if (request !== undefined) request = webidl.converters.RequestInfo(request)
    options = webidl.converters.CacheQueryOptions(options, prefix, 'options')

    // 1.
    let r = null

    // 2.
    if (request !== undefined) {
      // 2.1
      if (webidl.is.Request(request)) {
        // 2.1.1
        r = getRequestState(request)

        // 2.1.2
        if (r.method !== 'GET' && !options.ignoreMethod) {
          return []
        }
      } else if (typeof request === 'string') { // 2.2
        r = getRequestState(new Request(request))
      }
    }

    // 4.
    const promise = createDeferredPromise()

    // 5.
    // 5.1
    const requests = []

    // 5.2
    if (request === undefined) {
      // 5.2.1
      for (const requestResponse of this.#relevantRequestResponseList) {
        // 5.2.1.1
        requests.push(requestResponse[0])
      }
    } else { // 5.3
      // 5.3.1
      const requestResponses = this.#queryCache(r, options)

      // 5.3.2
      for (const requestResponse of requestResponses) {
        // 5.3.2.1
        requests.push(requestResponse[0])
      }
    }

    // 5.4
    queueMicrotask(() => {
      // 5.4.1
      const requestList = []

      // 5.4.2
      for (const request of requests) {
        const requestObject = fromInnerRequest(
          request,
          undefined,
          new AbortController().signal,
          'immutable'
        )
        // 5.4.2.1
        requestList.push(requestObject)
      }

      // 5.4.3
      promise.resolve(Object.freeze(requestList))
    })

    return promise.promise
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#batch-cache-operations-algorithm
   * @param {CacheBatchOperation[]} operations
   * @returns {requestResponseList}
   */
  #batchCacheOperations (operations) {
    // 1.
    const cache = this.#relevantRequestResponseList

    // 2.
    const backupCache = [...cache]

    // 3.
    const addedItems = []

    // 4.1
    const resultList = []

    try {
      // 4.2
      for (const operation of operations) {
        // 4.2.1
        if (operation.type !== 'delete' && operation.type !== 'put') {
          throw webidl.errors.exception({
            header: 'Cache.#batchCacheOperations',
            message: 'operation type does not match "delete" or "put"'
          })
        }

        // 4.2.2
        if (operation.type === 'delete' && operation.response != null) {
          throw webidl.errors.exception({
            header: 'Cache.#batchCacheOperations',
            message: 'delete operation should not have an associated response'
          })
        }

        // 4.2.3
        if (this.#queryCache(operation.request, operation.options, addedItems).length) {
          throw new DOMException('???', 'InvalidStateError')
        }

        // 4.2.4
        let requestResponses

        // 4.2.5
        if (operation.type === 'delete') {
          // 4.2.5.1
          requestResponses = this.#queryCache(operation.request, operation.options)

          // TODO: the spec is wrong, this is needed to pass WPTs
          if (requestResponses.length === 0) {
            return []
          }

          // 4.2.5.2
          for (const requestResponse of requestResponses) {
            const idx = cache.indexOf(requestResponse)
            assert(idx !== -1)

            // 4.2.5.2.1
            cache.splice(idx, 1)
          }
        } else if (operation.type === 'put') { // 4.2.6
          // 4.2.6.1
          if (operation.response == null) {
            throw webidl.errors.exception({
              header: 'Cache.#batchCacheOperations',
              message: 'put operation should have an associated response'
            })
          }

          // 4.2.6.2
          const r = operation.request

          // 4.2.6.3
          if (!urlIsHttpHttpsScheme(r.url)) {
            throw webidl.errors.exception({
              header: 'Cache.#batchCacheOperations',
              message: 'expected http or https scheme'
            })
          }

          // 4.2.6.4
          if (r.method !== 'GET') {
            throw webidl.errors.exception({
              header: 'Cache.#batchCacheOperations',
              message: 'not get method'
            })
          }

          // 4.2.6.5
          if (operation.options != null) {
            throw webidl.errors.exception({
              header: 'Cache.#batchCacheOperations',
              message: 'options must not be defined'
            })
          }

          // 4.2.6.6
          requestResponses = this.#queryCache(operation.request)

          // 4.2.6.7
          for (const requestResponse of requestResponses) {
            const idx = cache.indexOf(requestResponse)
            assert(idx !== -1)

            // 4.2.6.7.1
            cache.splice(idx, 1)
          }

          // 4.2.6.8
          cache.push([operation.request, operation.response])

          // 4.2.6.10
          addedItems.push([operation.request, operation.response])
        }

        // 4.2.7
        resultList.push([operation.request, operation.response])
      }

      // 4.3
      return resultList
    } catch (e) { // 5.
      // 5.1
      this.#relevantRequestResponseList.length = 0

      // 5.2
      this.#relevantRequestResponseList = backupCache

      // 5.3
      throw e
    }
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#query-cache
   * @param {any} requestQuery
   * @param {import('../../../types/cache').CacheQueryOptions} options
   * @param {requestResponseList} targetStorage
   * @returns {requestResponseList}
   */
  #queryCache (requestQuery, options, targetStorage) {
    /** @type {requestResponseList} */
    const resultList = []

    const storage = targetStorage ?? this.#relevantRequestResponseList

    for (const requestResponse of storage) {
      const [cachedRequest, cachedResponse] = requestResponse
      if (this.#requestMatchesCachedItem(requestQuery, cachedRequest, cachedResponse, options)) {
        resultList.push(requestResponse)
      }
    }

    return resultList
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#request-matches-cached-item-algorithm
   * @param {any} requestQuery
   * @param {any} request
   * @param {any | null} response
   * @param {import('../../../types/cache').CacheQueryOptions | undefined} options
   * @returns {boolean}
   */
  #requestMatchesCachedItem (requestQuery, request, response = null, options) {
    // if (options?.ignoreMethod === false && request.method === 'GET') {
    //   return false
    // }

    const queryURL = new URL(requestQuery.url)

    const cachedURL = new URL(request.url)

    if (options?.ignoreSearch) {
      cachedURL.search = ''

      queryURL.search = ''
    }

    if (!urlEquals(queryURL, cachedURL, true)) {
      return false
    }

    if (
      response == null ||
      options?.ignoreVary ||
      !response.headersList.contains('vary')
    ) {
      return true
    }

    const fieldValues = getFieldValues(response.headersList.get('vary'))

    for (const fieldValue of fieldValues) {
      if (fieldValue === '*') {
        return false
      }

      const requestValue = request.headersList.get(fieldValue)
      const queryValue = requestQuery.headersList.get(fieldValue)

      // If one has the header and the other doesn't, or one has
      // a different value than the other, return false
      if (requestValue !== queryValue) {
        return false
      }
    }

    return true
  }

  #internalMatchAll (request, options, maxResponses = Infinity) {
    // 1.
    let r = null

    // 2.
    if (request !== undefined) {
      if (webidl.is.Request(request)) {
        // 2.1.1
        r = getRequestState(request)

        // 2.1.2
        if (r.method !== 'GET' && !options.ignoreMethod) {
          return []
        }
      } else if (typeof request === 'string') {
        // 2.2.1
        r = getRequestState(new Request(request))
      }
    }

    // 5.
    // 5.1
    const responses = []

    // 5.2
    if (request === undefined) {
      // 5.2.1
      for (const requestResponse of this.#relevantRequestResponseList) {
        responses.push(requestResponse[1])
      }
    } else { // 5.3
      // 5.3.1
      const requestResponses = this.#queryCache(r, options)

      // 5.3.2
      for (const requestResponse of requestResponses) {
        responses.push(requestResponse[1])
      }
    }

    // 5.4
    // We don't implement CORs so we don't need to loop over the responses, yay!

    // 5.5.1
    const responseList = []

    // 5.5.2
    for (const response of responses) {
      // 5.5.2.1
      const responseObject = fromInnerResponse(response, 'immutable')

      responseList.push(responseObject.clone())

      if (responseList.length >= maxResponses) {
        break
      }
    }

    // 6.
    return Object.freeze(responseList)
  }
}

Object.defineProperties(Cache.prototype, {
  [Symbol.toStringTag]: {
    value: 'Cache',
    configurable: true
  },
  match: kEnumerableProperty,
  matchAll: kEnumerableProperty,
  add: kEnumerableProperty,
  addAll: kEnumerableProperty,
  put: kEnumerableProperty,
  delete: kEnumerableProperty,
  keys: kEnumerableProperty
})

const cacheQueryOptionConverters = [
  {
    key: 'ignoreSearch',
    converter: webidl.converters.boolean,
    defaultValue: () => false
  },
  {
    key: 'ignoreMethod',
    converter: webidl.converters.boolean,
    defaultValue: () => false
  },
  {
    key: 'ignoreVary',
    converter: webidl.converters.boolean,
    defaultValue: () => false
  }
]

webidl.converters.CacheQueryOptions = webidl.dictionaryConverter(cacheQueryOptionConverters)

webidl.converters.MultiCacheQueryOptions = webidl.dictionaryConverter([
  ...cacheQueryOptionConverters,
  {
    key: 'cacheName',
    converter: webidl.converters.DOMString
  }
])

webidl.converters.Response = webidl.interfaceConverter(
  webidl.is.Response,
  'Response'
)

webidl.converters['sequence<RequestInfo>'] = webidl.sequenceConverter(
  webidl.converters.RequestInfo
)

module.exports = {
  Cache
}
