/* globals AbortController */

'use strict'

const { extractBody, mixinBody, cloneBody, bodyUnusable } = require('./body')
const { Headers, fill: fillHeaders, HeadersList, setHeadersGuard, getHeadersGuard, setHeadersList, getHeadersList } = require('./headers')
const util = require('../../core/util')
const nodeUtil = require('node:util')
const {
  isValidHTTPToken,
  sameOrigin,
  environmentSettingsObject
} = require('./util')
const {
  forbiddenMethodsSet,
  corsSafeListedMethodsSet,
  referrerPolicy,
  requestRedirect,
  requestMode,
  requestCredentials,
  requestCache,
  requestDuplex
} = require('./constants')
const { kEnumerableProperty, normalizedMethodRecordsBase, normalizedMethodRecords } = util
const { webidl } = require('../webidl')
const { URLSerializer } = require('./data-url')
const { kConstruct } = require('../../core/symbols')
const assert = require('node:assert')
const { getMaxListeners, setMaxListeners, defaultMaxListeners } = require('node:events')

const kAbortController = Symbol('abortController')

const requestFinalizer = new FinalizationRegistry(({ signal, abort }) => {
  signal.removeEventListener('abort', abort)
})

const dependentControllerMap = new WeakMap()

let abortSignalHasEventHandlerLeakWarning

try {
  abortSignalHasEventHandlerLeakWarning = getMaxListeners(new AbortController().signal) > 0
} catch {
  abortSignalHasEventHandlerLeakWarning = false
}

function buildAbort (acRef) {
  return abort

  function abort () {
    const ac = acRef.deref()
    if (ac !== undefined) {
      // Currently, there is a problem with FinalizationRegistry.
      // https://github.com/nodejs/node/issues/49344
      // https://github.com/nodejs/node/issues/47748
      // In the case of abort, the first step is to unregister from it.
      // If the controller can refer to it, it is still registered.
      // It will be removed in the future.
      requestFinalizer.unregister(abort)

      // Unsubscribe a listener.
      // FinalizationRegistry will no longer be called, so this must be done.
      this.removeEventListener('abort', abort)

      ac.abort(this.reason)

      const controllerList = dependentControllerMap.get(ac.signal)

      if (controllerList !== undefined) {
        if (controllerList.size !== 0) {
          for (const ref of controllerList) {
            const ctrl = ref.deref()
            if (ctrl !== undefined) {
              ctrl.abort(this.reason)
            }
          }
          controllerList.clear()
        }
        dependentControllerMap.delete(ac.signal)
      }
    }
  }
}

let patchMethodWarning = false

// https://fetch.spec.whatwg.org/#request-class
class Request {
  /** @type {AbortSignal} */
  #signal

  /** @type {import('../../dispatcher/dispatcher')} */
  #dispatcher

  /** @type {Headers} */
  #headers

  #state

  // https://fetch.spec.whatwg.org/#dom-request
  constructor (input, init = undefined) {
    webidl.util.markAsUncloneable(this)

    if (input === kConstruct) {
      return
    }

    const prefix = 'Request constructor'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    input = webidl.converters.RequestInfo(input)
    init = webidl.converters.RequestInit(init)

    // 1. Let request be null.
    let request = null

    // 2. Let fallbackMode be null.
    let fallbackMode = null

    // 3. Let baseURL be this’s relevant settings object’s API base URL.
    const baseUrl = environmentSettingsObject.settingsObject.baseUrl

    // 4. Let signal be null.
    let signal = null

    // 5. If input is a string, then:
    if (typeof input === 'string') {
      this.#dispatcher = init.dispatcher

      // 1. Let parsedURL be the result of parsing input with baseURL.
      // 2. If parsedURL is failure, then throw a TypeError.
      let parsedURL
      try {
        parsedURL = new URL(input, baseUrl)
      } catch (err) {
        throw new TypeError('Failed to parse URL from ' + input, { cause: err })
      }

      // 3. If parsedURL includes credentials, then throw a TypeError.
      if (parsedURL.username || parsedURL.password) {
        throw new TypeError(
          'Request cannot be constructed from a URL that includes credentials: ' +
            input
        )
      }

      // 4. Set request to a new request whose URL is parsedURL.
      request = makeRequest({ urlList: [parsedURL] })

      // 5. Set fallbackMode to "cors".
      fallbackMode = 'cors'
    } else {
      // 6. Otherwise:

      // 7. Assert: input is a Request object.
      assert(webidl.is.Request(input))

      // 8. Set request to input’s request.
      request = input.#state

      // 9. Set signal to input’s signal.
      signal = input.#signal

      this.#dispatcher = init.dispatcher || input.#dispatcher
    }

    // 7. Let origin be this’s relevant settings object’s origin.
    const origin = environmentSettingsObject.settingsObject.origin

    // 8. Let window be "client".
    let window = 'client'

    // 9. If request’s window is an environment settings object and its origin
    // is same origin with origin, then set window to request’s window.
    if (
      request.window?.constructor?.name === 'EnvironmentSettingsObject' &&
      sameOrigin(request.window, origin)
    ) {
      window = request.window
    }

    // 10. If init["window"] exists and is non-null, then throw a TypeError.
    if (init.window != null) {
      throw new TypeError(`'window' option '${window}' must be null`)
    }

    // 11. If init["window"] exists, then set window to "no-window".
    if ('window' in init) {
      window = 'no-window'
    }

    // 12. Set request to a new request with the following properties:
    request = makeRequest({
      // URL request’s URL.
      // undici implementation note: this is set as the first item in request's urlList in makeRequest
      // method request’s method.
      method: request.method,
      // header list A copy of request’s header list.
      // undici implementation note: headersList is cloned in makeRequest
      headersList: request.headersList,
      // unsafe-request flag Set.
      unsafeRequest: request.unsafeRequest,
      // client This’s relevant settings object.
      client: environmentSettingsObject.settingsObject,
      // window window.
      window,
      // priority request’s priority.
      priority: request.priority,
      // origin request’s origin. The propagation of the origin is only significant for navigation requests
      // being handled by a service worker. In this scenario a request can have an origin that is different
      // from the current client.
      origin: request.origin,
      // referrer request’s referrer.
      referrer: request.referrer,
      // referrer policy request’s referrer policy.
      referrerPolicy: request.referrerPolicy,
      // mode request’s mode.
      mode: request.mode,
      // credentials mode request’s credentials mode.
      credentials: request.credentials,
      // cache mode request’s cache mode.
      cache: request.cache,
      // redirect mode request’s redirect mode.
      redirect: request.redirect,
      // integrity metadata request’s integrity metadata.
      integrity: request.integrity,
      // keepalive request’s keepalive.
      keepalive: request.keepalive,
      // reload-navigation flag request’s reload-navigation flag.
      reloadNavigation: request.reloadNavigation,
      // history-navigation flag request’s history-navigation flag.
      historyNavigation: request.historyNavigation,
      // URL list A clone of request’s URL list.
      urlList: [...request.urlList]
    })

    const initHasKey = Object.keys(init).length !== 0

    // 13. If init is not empty, then:
    if (initHasKey) {
      // 1. If request’s mode is "navigate", then set it to "same-origin".
      if (request.mode === 'navigate') {
        request.mode = 'same-origin'
      }

      // 2. Unset request’s reload-navigation flag.
      request.reloadNavigation = false

      // 3. Unset request’s history-navigation flag.
      request.historyNavigation = false

      // 4. Set request’s origin to "client".
      request.origin = 'client'

      // 5. Set request’s referrer to "client"
      request.referrer = 'client'

      // 6. Set request’s referrer policy to the empty string.
      request.referrerPolicy = ''

      // 7. Set request’s URL to request’s current URL.
      request.url = request.urlList[request.urlList.length - 1]

      // 8. Set request’s URL list to « request’s URL ».
      request.urlList = [request.url]
    }

    // 14. If init["referrer"] exists, then:
    if (init.referrer !== undefined) {
      // 1. Let referrer be init["referrer"].
      const referrer = init.referrer

      // 2. If referrer is the empty string, then set request’s referrer to "no-referrer".
      if (referrer === '') {
        request.referrer = 'no-referrer'
      } else {
        // 1. Let parsedReferrer be the result of parsing referrer with
        // baseURL.
        // 2. If parsedReferrer is failure, then throw a TypeError.
        let parsedReferrer
        try {
          parsedReferrer = new URL(referrer, baseUrl)
        } catch (err) {
          throw new TypeError(`Referrer "${referrer}" is not a valid URL.`, { cause: err })
        }

        // 3. If one of the following is true
        // - parsedReferrer’s scheme is "about" and path is the string "client"
        // - parsedReferrer’s origin is not same origin with origin
        // then set request’s referrer to "client".
        if (
          (parsedReferrer.protocol === 'about:' && parsedReferrer.hostname === 'client') ||
          (origin && !sameOrigin(parsedReferrer, environmentSettingsObject.settingsObject.baseUrl))
        ) {
          request.referrer = 'client'
        } else {
          // 4. Otherwise, set request’s referrer to parsedReferrer.
          request.referrer = parsedReferrer
        }
      }
    }

    // 15. If init["referrerPolicy"] exists, then set request’s referrer policy
    // to it.
    if (init.referrerPolicy !== undefined) {
      request.referrerPolicy = init.referrerPolicy
    }

    // 16. Let mode be init["mode"] if it exists, and fallbackMode otherwise.
    let mode
    if (init.mode !== undefined) {
      mode = init.mode
    } else {
      mode = fallbackMode
    }

    // 17. If mode is "navigate", then throw a TypeError.
    if (mode === 'navigate') {
      throw webidl.errors.exception({
        header: 'Request constructor',
        message: 'invalid request mode navigate.'
      })
    }

    // 18. If mode is non-null, set request’s mode to mode.
    if (mode != null) {
      request.mode = mode
    }

    // 19. If init["credentials"] exists, then set request’s credentials mode
    // to it.
    if (init.credentials !== undefined) {
      request.credentials = init.credentials
    }

    // 18. If init["cache"] exists, then set request’s cache mode to it.
    if (init.cache !== undefined) {
      request.cache = init.cache
    }

    // 21. If request’s cache mode is "only-if-cached" and request’s mode is
    // not "same-origin", then throw a TypeError.
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
      throw new TypeError(
        "'only-if-cached' can be set only with 'same-origin' mode"
      )
    }

    // 22. If init["redirect"] exists, then set request’s redirect mode to it.
    if (init.redirect !== undefined) {
      request.redirect = init.redirect
    }

    // 23. If init["integrity"] exists, then set request’s integrity metadata to it.
    if (init.integrity != null) {
      request.integrity = String(init.integrity)
    }

    // 24. If init["keepalive"] exists, then set request’s keepalive to it.
    if (init.keepalive !== undefined) {
      request.keepalive = Boolean(init.keepalive)
    }

    // 25. If init["method"] exists, then:
    if (init.method !== undefined) {
      // 1. Let method be init["method"].
      let method = init.method

      const mayBeNormalized = normalizedMethodRecords[method]

      if (mayBeNormalized !== undefined) {
        // Note: Bypass validation DELETE, GET, HEAD, OPTIONS, POST, PUT, PATCH and these lowercase ones
        request.method = mayBeNormalized
      } else {
        // 2. If method is not a method or method is a forbidden method, then
        // throw a TypeError.
        if (!isValidHTTPToken(method)) {
          throw new TypeError(`'${method}' is not a valid HTTP method.`)
        }

        const upperCase = method.toUpperCase()

        if (forbiddenMethodsSet.has(upperCase)) {
          throw new TypeError(`'${method}' HTTP method is unsupported.`)
        }

        // 3. Normalize method.
        // https://fetch.spec.whatwg.org/#concept-method-normalize
        // Note: must be in uppercase
        method = normalizedMethodRecordsBase[upperCase] ?? method

        // 4. Set request’s method to method.
        request.method = method
      }

      if (!patchMethodWarning && request.method === 'patch') {
        process.emitWarning('Using `patch` is highly likely to result in a `405 Method Not Allowed`. `PATCH` is much more likely to succeed.', {
          code: 'UNDICI-FETCH-patch'
        })

        patchMethodWarning = true
      }
    }

    // 26. If init["signal"] exists, then set signal to it.
    if (init.signal !== undefined) {
      signal = init.signal
    }

    // 27. Set this’s request to request.
    this.#state = request

    // 28. Set this’s signal to a new AbortSignal object with this’s relevant
    // Realm.
    // TODO: could this be simplified with AbortSignal.any
    // (https://dom.spec.whatwg.org/#dom-abortsignal-any)
    const ac = new AbortController()
    this.#signal = ac.signal

    // 29. If signal is not null, then make this’s signal follow signal.
    if (signal != null) {
      if (signal.aborted) {
        ac.abort(signal.reason)
      } else {
        // Keep a strong ref to ac while request object
        // is alive. This is needed to prevent AbortController
        // from being prematurely garbage collected.
        // See, https://github.com/nodejs/undici/issues/1926.
        this[kAbortController] = ac

        const acRef = new WeakRef(ac)
        const abort = buildAbort(acRef)

        // If the max amount of listeners is equal to the default, increase it
        if (abortSignalHasEventHandlerLeakWarning && getMaxListeners(signal) === defaultMaxListeners) {
          setMaxListeners(1500, signal)
        }

        util.addAbortListener(signal, abort)
        // The third argument must be a registry key to be unregistered.
        // Without it, you cannot unregister.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
        // abort is used as the unregister key. (because it is unique)
        requestFinalizer.register(ac, { signal, abort }, abort)
      }
    }

    // 30. Set this’s headers to a new Headers object with this’s relevant
    // Realm, whose header list is request’s header list and guard is
    // "request".
    this.#headers = new Headers(kConstruct)
    setHeadersList(this.#headers, request.headersList)
    setHeadersGuard(this.#headers, 'request')

    // 31. If this’s request’s mode is "no-cors", then:
    if (mode === 'no-cors') {
      // 1. If this’s request’s method is not a CORS-safelisted method,
      // then throw a TypeError.
      if (!corsSafeListedMethodsSet.has(request.method)) {
        throw new TypeError(
          `'${request.method} is unsupported in no-cors mode.`
        )
      }

      // 2. Set this’s headers’s guard to "request-no-cors".
      setHeadersGuard(this.#headers, 'request-no-cors')
    }

    // 32. If init is not empty, then:
    if (initHasKey) {
      /** @type {HeadersList} */
      const headersList = getHeadersList(this.#headers)
      // 1. Let headers be a copy of this’s headers and its associated header
      // list.
      // 2. If init["headers"] exists, then set headers to init["headers"].
      const headers = init.headers !== undefined ? init.headers : new HeadersList(headersList)

      // 3. Empty this’s headers’s header list.
      headersList.clear()

      // 4. If headers is a Headers object, then for each header in its header
      // list, append header’s name/header’s value to this’s headers.
      if (headers instanceof HeadersList) {
        for (const { name, value } of headers.rawValues()) {
          headersList.append(name, value, false)
        }
        // Note: Copy the `set-cookie` meta-data.
        headersList.cookies = headers.cookies
      } else {
        // 5. Otherwise, fill this’s headers with headers.
        fillHeaders(this.#headers, headers)
      }
    }

    // 33. Let inputBody be input’s request’s body if input is a Request
    // object; otherwise null.
    const inputBody = webidl.is.Request(input) ? input.#state.body : null

    // 34. If either init["body"] exists and is non-null or inputBody is
    // non-null, and request’s method is `GET` or `HEAD`, then throw a
    // TypeError.
    if (
      (init.body != null || inputBody != null) &&
      (request.method === 'GET' || request.method === 'HEAD')
    ) {
      throw new TypeError('Request with GET/HEAD method cannot have body.')
    }

    // 35. Let initBody be null.
    let initBody = null

    // 36. If init["body"] exists and is non-null, then:
    if (init.body != null) {
      // 1. Let Content-Type be null.
      // 2. Set initBody and Content-Type to the result of extracting
      // init["body"], with keepalive set to request’s keepalive.
      const [extractedBody, contentType] = extractBody(
        init.body,
        request.keepalive
      )
      initBody = extractedBody

      // 3, If Content-Type is non-null and this’s headers’s header list does
      // not contain `Content-Type`, then append `Content-Type`/Content-Type to
      // this’s headers.
      if (contentType && !getHeadersList(this.#headers).contains('content-type', true)) {
        this.#headers.append('content-type', contentType, true)
      }
    }

    // 37. Let inputOrInitBody be initBody if it is non-null; otherwise
    // inputBody.
    const inputOrInitBody = initBody ?? inputBody

    // 38. If inputOrInitBody is non-null and inputOrInitBody’s source is
    // null, then:
    if (inputOrInitBody != null && inputOrInitBody.source == null) {
      // 1. If initBody is non-null and init["duplex"] does not exist,
      //    then throw a TypeError.
      if (initBody != null && init.duplex == null) {
        throw new TypeError('RequestInit: duplex option is required when sending a body.')
      }

      // 2. If this’s request’s mode is neither "same-origin" nor "cors",
      // then throw a TypeError.
      if (request.mode !== 'same-origin' && request.mode !== 'cors') {
        throw new TypeError(
          'If request is made from ReadableStream, mode should be "same-origin" or "cors"'
        )
      }

      // 3. Set this’s request’s use-CORS-preflight flag.
      request.useCORSPreflightFlag = true
    }

    // 39. Let finalBody be inputOrInitBody.
    let finalBody = inputOrInitBody

    // 40. If initBody is null and inputBody is non-null, then:
    if (initBody == null && inputBody != null) {
      // 1. If input is unusable, then throw a TypeError.
      if (bodyUnusable(input.#state)) {
        throw new TypeError(
          'Cannot construct a Request with a Request object that has already been used.'
        )
      }

      // 2. Set finalBody to the result of creating a proxy for inputBody.
      // https://streams.spec.whatwg.org/#readablestream-create-a-proxy
      const identityTransform = new TransformStream()
      inputBody.stream.pipeThrough(identityTransform)
      finalBody = {
        source: inputBody.source,
        length: inputBody.length,
        stream: identityTransform.readable
      }
    }

    // 41. Set this’s request’s body to finalBody.
    this.#state.body = finalBody
  }

  // Returns request’s HTTP method, which is "GET" by default.
  get method () {
    webidl.brandCheck(this, Request)

    // The method getter steps are to return this’s request’s method.
    return this.#state.method
  }

  // Returns the URL of request as a string.
  get url () {
    webidl.brandCheck(this, Request)

    // The url getter steps are to return this’s request’s URL, serialized.
    return URLSerializer(this.#state.url)
  }

  // Returns a Headers object consisting of the headers associated with request.
  // Note that headers added in the network layer by the user agent will not
  // be accounted for in this object, e.g., the "Host" header.
  get headers () {
    webidl.brandCheck(this, Request)

    // The headers getter steps are to return this’s headers.
    return this.#headers
  }

  // Returns the kind of resource requested by request, e.g., "document"
  // or "script".
  get destination () {
    webidl.brandCheck(this, Request)

    // The destination getter are to return this’s request’s destination.
    return this.#state.destination
  }

  // Returns the referrer of request. Its value can be a same-origin URL if
  // explicitly set in init, the empty string to indicate no referrer, and
  // "about:client" when defaulting to the global’s default. This is used
  // during fetching to determine the value of the `Referer` header of the
  // request being made.
  get referrer () {
    webidl.brandCheck(this, Request)

    // 1. If this’s request’s referrer is "no-referrer", then return the
    // empty string.
    if (this.#state.referrer === 'no-referrer') {
      return ''
    }

    // 2. If this’s request’s referrer is "client", then return
    // "about:client".
    if (this.#state.referrer === 'client') {
      return 'about:client'
    }

    // Return this’s request’s referrer, serialized.
    return this.#state.referrer.toString()
  }

  // Returns the referrer policy associated with request.
  // This is used during fetching to compute the value of the request’s
  // referrer.
  get referrerPolicy () {
    webidl.brandCheck(this, Request)

    // The referrerPolicy getter steps are to return this’s request’s referrer policy.
    return this.#state.referrerPolicy
  }

  // Returns the mode associated with request, which is a string indicating
  // whether the request will use CORS, or will be restricted to same-origin
  // URLs.
  get mode () {
    webidl.brandCheck(this, Request)

    // The mode getter steps are to return this’s request’s mode.
    return this.#state.mode
  }

  // Returns the credentials mode associated with request,
  // which is a string indicating whether credentials will be sent with the
  // request always, never, or only when sent to a same-origin URL.
  get credentials () {
    webidl.brandCheck(this, Request)

    // The credentials getter steps are to return this’s request’s credentials mode.
    return this.#state.credentials
  }

  // Returns the cache mode associated with request,
  // which is a string indicating how the request will
  // interact with the browser’s cache when fetching.
  get cache () {
    webidl.brandCheck(this, Request)

    // The cache getter steps are to return this’s request’s cache mode.
    return this.#state.cache
  }

  // Returns the redirect mode associated with request,
  // which is a string indicating how redirects for the
  // request will be handled during fetching. A request
  // will follow redirects by default.
  get redirect () {
    webidl.brandCheck(this, Request)

    // The redirect getter steps are to return this’s request’s redirect mode.
    return this.#state.redirect
  }

  // Returns request’s subresource integrity metadata, which is a
  // cryptographic hash of the resource being fetched. Its value
  // consists of multiple hashes separated by whitespace. [SRI]
  get integrity () {
    webidl.brandCheck(this, Request)

    // The integrity getter steps are to return this’s request’s integrity
    // metadata.
    return this.#state.integrity
  }

  // Returns a boolean indicating whether or not request can outlive the
  // global in which it was created.
  get keepalive () {
    webidl.brandCheck(this, Request)

    // The keepalive getter steps are to return this’s request’s keepalive.
    return this.#state.keepalive
  }

  // Returns a boolean indicating whether or not request is for a reload
  // navigation.
  get isReloadNavigation () {
    webidl.brandCheck(this, Request)

    // The isReloadNavigation getter steps are to return true if this’s
    // request’s reload-navigation flag is set; otherwise false.
    return this.#state.reloadNavigation
  }

  // Returns a boolean indicating whether or not request is for a history
  // navigation (a.k.a. back-forward navigation).
  get isHistoryNavigation () {
    webidl.brandCheck(this, Request)

    // The isHistoryNavigation getter steps are to return true if this’s request’s
    // history-navigation flag is set; otherwise false.
    return this.#state.historyNavigation
  }

  // Returns the signal associated with request, which is an AbortSignal
  // object indicating whether or not request has been aborted, and its
  // abort event handler.
  get signal () {
    webidl.brandCheck(this, Request)

    // The signal getter steps are to return this’s signal.
    return this.#signal
  }

  get body () {
    webidl.brandCheck(this, Request)

    return this.#state.body ? this.#state.body.stream : null
  }

  get bodyUsed () {
    webidl.brandCheck(this, Request)

    return !!this.#state.body && util.isDisturbed(this.#state.body.stream)
  }

  get duplex () {
    webidl.brandCheck(this, Request)

    return 'half'
  }

  // Returns a clone of request.
  clone () {
    webidl.brandCheck(this, Request)

    // 1. If this is unusable, then throw a TypeError.
    if (bodyUnusable(this.#state)) {
      throw new TypeError('unusable')
    }

    // 2. Let clonedRequest be the result of cloning this’s request.
    const clonedRequest = cloneRequest(this.#state)

    // 3. Let clonedRequestObject be the result of creating a Request object,
    // given clonedRequest, this’s headers’s guard, and this’s relevant Realm.
    // 4. Make clonedRequestObject’s signal follow this’s signal.
    const ac = new AbortController()
    if (this.signal.aborted) {
      ac.abort(this.signal.reason)
    } else {
      let list = dependentControllerMap.get(this.signal)
      if (list === undefined) {
        list = new Set()
        dependentControllerMap.set(this.signal, list)
      }
      const acRef = new WeakRef(ac)
      list.add(acRef)
      util.addAbortListener(
        ac.signal,
        buildAbort(acRef)
      )
    }

    // 4. Return clonedRequestObject.
    return fromInnerRequest(clonedRequest, this.#dispatcher, ac.signal, getHeadersGuard(this.#headers))
  }

  [nodeUtil.inspect.custom] (depth, options) {
    if (options.depth === null) {
      options.depth = 2
    }

    options.colors ??= true

    const properties = {
      method: this.method,
      url: this.url,
      headers: this.headers,
      destination: this.destination,
      referrer: this.referrer,
      referrerPolicy: this.referrerPolicy,
      mode: this.mode,
      credentials: this.credentials,
      cache: this.cache,
      redirect: this.redirect,
      integrity: this.integrity,
      keepalive: this.keepalive,
      isReloadNavigation: this.isReloadNavigation,
      isHistoryNavigation: this.isHistoryNavigation,
      signal: this.signal
    }

    return `Request ${nodeUtil.formatWithOptions(options, properties)}`
  }

  /**
   * @param {Request} request
   * @param {AbortSignal} newSignal
   */
  static setRequestSignal (request, newSignal) {
    request.#signal = newSignal
    return request
  }

  /**
   * @param {Request} request
   */
  static getRequestDispatcher (request) {
    return request.#dispatcher
  }

  /**
   * @param {Request} request
   * @param {import('../../dispatcher/dispatcher')} newDispatcher
   */
  static setRequestDispatcher (request, newDispatcher) {
    request.#dispatcher = newDispatcher
  }

  /**
   * @param {Request} request
   * @param {Headers} newHeaders
   */
  static setRequestHeaders (request, newHeaders) {
    request.#headers = newHeaders
  }

  /**
   * @param {Request} request
   */
  static getRequestState (request) {
    return request.#state
  }

  /**
   * @param {Request} request
   * @param {any} newState
   */
  static setRequestState (request, newState) {
    request.#state = newState
  }
}

const { setRequestSignal, getRequestDispatcher, setRequestDispatcher, setRequestHeaders, getRequestState, setRequestState } = Request
Reflect.deleteProperty(Request, 'setRequestSignal')
Reflect.deleteProperty(Request, 'getRequestDispatcher')
Reflect.deleteProperty(Request, 'setRequestDispatcher')
Reflect.deleteProperty(Request, 'setRequestHeaders')
Reflect.deleteProperty(Request, 'getRequestState')
Reflect.deleteProperty(Request, 'setRequestState')

mixinBody(Request, getRequestState)

// https://fetch.spec.whatwg.org/#requests
function makeRequest (init) {
  return {
    method: init.method ?? 'GET',
    localURLsOnly: init.localURLsOnly ?? false,
    unsafeRequest: init.unsafeRequest ?? false,
    body: init.body ?? null,
    client: init.client ?? null,
    reservedClient: init.reservedClient ?? null,
    replacesClientId: init.replacesClientId ?? '',
    window: init.window ?? 'client',
    keepalive: init.keepalive ?? false,
    serviceWorkers: init.serviceWorkers ?? 'all',
    initiator: init.initiator ?? '',
    destination: init.destination ?? '',
    priority: init.priority ?? null,
    origin: init.origin ?? 'client',
    policyContainer: init.policyContainer ?? 'client',
    referrer: init.referrer ?? 'client',
    referrerPolicy: init.referrerPolicy ?? '',
    mode: init.mode ?? 'no-cors',
    useCORSPreflightFlag: init.useCORSPreflightFlag ?? false,
    credentials: init.credentials ?? 'same-origin',
    useCredentials: init.useCredentials ?? false,
    cache: init.cache ?? 'default',
    redirect: init.redirect ?? 'follow',
    integrity: init.integrity ?? '',
    cryptoGraphicsNonceMetadata: init.cryptoGraphicsNonceMetadata ?? '',
    parserMetadata: init.parserMetadata ?? '',
    reloadNavigation: init.reloadNavigation ?? false,
    historyNavigation: init.historyNavigation ?? false,
    userActivation: init.userActivation ?? false,
    taintedOrigin: init.taintedOrigin ?? false,
    redirectCount: init.redirectCount ?? 0,
    responseTainting: init.responseTainting ?? 'basic',
    preventNoCacheCacheControlHeaderModification: init.preventNoCacheCacheControlHeaderModification ?? false,
    done: init.done ?? false,
    timingAllowFailed: init.timingAllowFailed ?? false,
    useURLCredentials: init.useURLCredentials ?? undefined,
    traversableForUserPrompts: init.traversableForUserPrompts ?? 'client',
    urlList: init.urlList,
    url: init.urlList[0],
    headersList: init.headersList
      ? new HeadersList(init.headersList)
      : new HeadersList()
  }
}

// https://fetch.spec.whatwg.org/#concept-request-clone
function cloneRequest (request) {
  // To clone a request request, run these steps:

  // 1. Let newRequest be a copy of request, except for its body.
  const newRequest = makeRequest({ ...request, body: null })

  // 2. If request’s body is non-null, set newRequest’s body to the
  // result of cloning request’s body.
  if (request.body != null) {
    newRequest.body = cloneBody(request.body)
  }

  // 3. Return newRequest.
  return newRequest
}

/**
 * @see https://fetch.spec.whatwg.org/#request-create
 * @param {any} innerRequest
 * @param {import('../../dispatcher/agent')} dispatcher
 * @param {AbortSignal} signal
 * @param {'request' | 'immutable' | 'request-no-cors' | 'response' | 'none'} guard
 * @returns {Request}
 */
function fromInnerRequest (innerRequest, dispatcher, signal, guard) {
  const request = new Request(kConstruct)
  setRequestState(request, innerRequest)
  setRequestDispatcher(request, dispatcher)
  setRequestSignal(request, signal)
  const headers = new Headers(kConstruct)
  setRequestHeaders(request, headers)
  setHeadersList(headers, innerRequest.headersList)
  setHeadersGuard(headers, guard)
  return request
}

Object.defineProperties(Request.prototype, {
  method: kEnumerableProperty,
  url: kEnumerableProperty,
  headers: kEnumerableProperty,
  redirect: kEnumerableProperty,
  clone: kEnumerableProperty,
  signal: kEnumerableProperty,
  duplex: kEnumerableProperty,
  destination: kEnumerableProperty,
  body: kEnumerableProperty,
  bodyUsed: kEnumerableProperty,
  isHistoryNavigation: kEnumerableProperty,
  isReloadNavigation: kEnumerableProperty,
  keepalive: kEnumerableProperty,
  integrity: kEnumerableProperty,
  cache: kEnumerableProperty,
  credentials: kEnumerableProperty,
  attribute: kEnumerableProperty,
  referrerPolicy: kEnumerableProperty,
  referrer: kEnumerableProperty,
  mode: kEnumerableProperty,
  [Symbol.toStringTag]: {
    value: 'Request',
    configurable: true
  }
})

webidl.is.Request = webidl.util.MakeTypeAssertion(Request)

/**
 * @param {*} V
 * @returns {import('../../../types/fetch').Request|string}
 *
 * @see https://fetch.spec.whatwg.org/#requestinfo
 */
webidl.converters.RequestInfo = function (V) {
  if (typeof V === 'string') {
    return webidl.converters.USVString(V)
  }

  if (webidl.is.Request(V)) {
    return V
  }

  return webidl.converters.USVString(V)
}

/**
 * @param {*} V
 * @returns {import('../../../types/fetch').RequestInit}
 * @see https://fetch.spec.whatwg.org/#requestinit
 */
webidl.converters.RequestInit = webidl.dictionaryConverter([
  {
    key: 'method',
    converter: webidl.converters.ByteString
  },
  {
    key: 'headers',
    converter: webidl.converters.HeadersInit
  },
  {
    key: 'body',
    converter: webidl.nullableConverter(
      webidl.converters.BodyInit
    )
  },
  {
    key: 'referrer',
    converter: webidl.converters.USVString
  },
  {
    key: 'referrerPolicy',
    converter: webidl.converters.DOMString,
    // https://w3c.github.io/webappsec-referrer-policy/#referrer-policy
    allowedValues: referrerPolicy
  },
  {
    key: 'mode',
    converter: webidl.converters.DOMString,
    // https://fetch.spec.whatwg.org/#concept-request-mode
    allowedValues: requestMode
  },
  {
    key: 'credentials',
    converter: webidl.converters.DOMString,
    // https://fetch.spec.whatwg.org/#requestcredentials
    allowedValues: requestCredentials
  },
  {
    key: 'cache',
    converter: webidl.converters.DOMString,
    // https://fetch.spec.whatwg.org/#requestcache
    allowedValues: requestCache
  },
  {
    key: 'redirect',
    converter: webidl.converters.DOMString,
    // https://fetch.spec.whatwg.org/#requestredirect
    allowedValues: requestRedirect
  },
  {
    key: 'integrity',
    converter: webidl.converters.DOMString
  },
  {
    key: 'keepalive',
    converter: webidl.converters.boolean
  },
  {
    key: 'signal',
    converter: webidl.nullableConverter(
      (signal) => webidl.converters.AbortSignal(
        signal,
        'RequestInit',
        'signal'
      )
    )
  },
  {
    key: 'window',
    converter: webidl.converters.any
  },
  {
    key: 'duplex',
    converter: webidl.converters.DOMString,
    allowedValues: requestDuplex
  },
  {
    key: 'dispatcher', // undici specific option
    converter: webidl.converters.any
  },
  {
    key: 'priority',
    converter: webidl.converters.DOMString,
    allowedValues: ['high', 'low', 'auto'],
    defaultValue: () => 'auto'
  }
])

module.exports = {
  Request,
  makeRequest,
  fromInnerRequest,
  cloneRequest,
  getRequestDispatcher,
  getRequestState
}
