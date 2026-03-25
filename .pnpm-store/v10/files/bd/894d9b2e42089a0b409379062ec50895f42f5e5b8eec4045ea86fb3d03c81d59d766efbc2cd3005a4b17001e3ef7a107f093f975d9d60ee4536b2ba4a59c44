// https://github.com/Ethan-Arrowood/undici-fetch

'use strict'

const {
  makeNetworkError,
  makeAppropriateNetworkError,
  filterResponse,
  makeResponse,
  fromInnerResponse,
  getResponseState
} = require('./response')
const { HeadersList } = require('./headers')
const { Request, cloneRequest, getRequestDispatcher, getRequestState } = require('./request')
const zlib = require('node:zlib')
const {
  makePolicyContainer,
  clonePolicyContainer,
  requestBadPort,
  TAOCheck,
  appendRequestOriginHeader,
  responseLocationURL,
  requestCurrentURL,
  setRequestReferrerPolicyOnRedirect,
  tryUpgradeRequestToAPotentiallyTrustworthyURL,
  createOpaqueTimingInfo,
  appendFetchMetadata,
  corsCheck,
  crossOriginResourcePolicyCheck,
  determineRequestsReferrer,
  coarsenedSharedCurrentTime,
  sameOrigin,
  isCancelled,
  isAborted,
  isErrorLike,
  fullyReadBody,
  readableStreamClose,
  urlIsLocal,
  urlIsHttpHttpsScheme,
  urlHasHttpsScheme,
  clampAndCoarsenConnectionTimingInfo,
  simpleRangeHeaderValue,
  buildContentRange,
  createInflate,
  extractMimeType
} = require('./util')
const assert = require('node:assert')
const { safelyExtractBody, extractBody } = require('./body')
const {
  redirectStatusSet,
  nullBodyStatus,
  safeMethodsSet,
  requestBodyHeader,
  subresourceSet
} = require('./constants')
const EE = require('node:events')
const { Readable, pipeline, finished, isErrored, isReadable } = require('node:stream')
const { addAbortListener, bufferToLowerCasedHeaderName } = require('../../core/util')
const { dataURLProcessor, serializeAMimeType, minimizeSupportedMimeType } = require('./data-url')
const { getGlobalDispatcher } = require('../../global')
const { webidl } = require('../webidl')
const { STATUS_CODES } = require('node:http')
const { bytesMatch } = require('../subresource-integrity/subresource-integrity')
const { createDeferredPromise } = require('../../util/promise')
const { isomorphicEncode } = require('../infra')
const { runtimeFeatures } = require('../../util/runtime-features')

// Node.js v23.8.0+ and v22.15.0+ supports Zstandard
const hasZstd = runtimeFeatures.has('zstd')

const GET_OR_HEAD = ['GET', 'HEAD']

const defaultUserAgent = typeof __UNDICI_IS_NODE__ !== 'undefined' || typeof esbuildDetection !== 'undefined'
  ? 'node'
  : 'undici'

/** @type {import('buffer').resolveObjectURL} */
let resolveObjectURL

class Fetch extends EE {
  constructor (dispatcher) {
    super()

    this.dispatcher = dispatcher
    this.connection = null
    this.dump = false
    this.state = 'ongoing'
  }

  terminate (reason) {
    if (this.state !== 'ongoing') {
      return
    }

    this.state = 'terminated'
    this.connection?.destroy(reason)
    this.emit('terminated', reason)
  }

  // https://fetch.spec.whatwg.org/#fetch-controller-abort
  abort (error) {
    if (this.state !== 'ongoing') {
      return
    }

    // 1. Set controller’s state to "aborted".
    this.state = 'aborted'

    // 2. Let fallbackError be an "AbortError" DOMException.
    // 3. Set error to fallbackError if it is not given.
    if (!error) {
      error = new DOMException('The operation was aborted.', 'AbortError')
    }

    // 4. Let serializedError be StructuredSerialize(error).
    //    If that threw an exception, catch it, and let
    //    serializedError be StructuredSerialize(fallbackError).

    // 5. Set controller’s serialized abort reason to serializedError.
    this.serializedAbortReason = error

    this.connection?.destroy(error)
    this.emit('terminated', error)
  }
}

function handleFetchDone (response) {
  finalizeAndReportTiming(response, 'fetch')
}

// https://fetch.spec.whatwg.org/#fetch-method
function fetch (input, init = undefined) {
  webidl.argumentLengthCheck(arguments, 1, 'globalThis.fetch')

  // 1. Let p be a new promise.
  let p = createDeferredPromise()

  // 2. Let requestObject be the result of invoking the initial value of
  // Request as constructor with input and init as arguments. If this throws
  // an exception, reject p with it and return p.
  let requestObject

  try {
    requestObject = new Request(input, init)
  } catch (e) {
    p.reject(e)
    return p.promise
  }

  // 3. Let request be requestObject’s request.
  const request = getRequestState(requestObject)

  // 4. If requestObject’s signal’s aborted flag is set, then:
  if (requestObject.signal.aborted) {
    // 1. Abort the fetch() call with p, request, null, and
    //    requestObject’s signal’s abort reason.
    abortFetch(p, request, null, requestObject.signal.reason)

    // 2. Return p.
    return p.promise
  }

  // 5. Let globalObject be request’s client’s global object.
  const globalObject = request.client.globalObject

  // 6. If globalObject is a ServiceWorkerGlobalScope object, then set
  // request’s service-workers mode to "none".
  if (globalObject?.constructor?.name === 'ServiceWorkerGlobalScope') {
    request.serviceWorkers = 'none'
  }

  // 7. Let responseObject be null.
  let responseObject = null

  // 8. Let relevantRealm be this’s relevant Realm.

  // 9. Let locallyAborted be false.
  let locallyAborted = false

  // 10. Let controller be null.
  let controller = null

  // 11. Add the following abort steps to requestObject’s signal:
  addAbortListener(
    requestObject.signal,
    () => {
      // 1. Set locallyAborted to true.
      locallyAborted = true

      // 2. Assert: controller is non-null.
      assert(controller != null)

      // 3. Abort controller with requestObject’s signal’s abort reason.
      controller.abort(requestObject.signal.reason)

      const realResponse = responseObject?.deref()

      // 4. Abort the fetch() call with p, request, responseObject,
      //    and requestObject’s signal’s abort reason.
      abortFetch(p, request, realResponse, requestObject.signal.reason)
    }
  )

  // 12. Let handleFetchDone given response response be to finalize and
  // report timing with response, globalObject, and "fetch".
  // see function handleFetchDone

  // 13. Set controller to the result of calling fetch given request,
  // with processResponseEndOfBody set to handleFetchDone, and processResponse
  // given response being these substeps:

  const processResponse = (response) => {
    // 1. If locallyAborted is true, terminate these substeps.
    if (locallyAborted) {
      return
    }

    // 2. If response’s aborted flag is set, then:
    if (response.aborted) {
      // 1. Let deserializedError be the result of deserialize a serialized
      //    abort reason given controller’s serialized abort reason and
      //    relevantRealm.

      // 2. Abort the fetch() call with p, request, responseObject, and
      //    deserializedError.

      abortFetch(p, request, responseObject, controller.serializedAbortReason)
      return
    }

    // 3. If response is a network error, then reject p with a TypeError
    // and terminate these substeps.
    if (response.type === 'error') {
      p.reject(new TypeError('fetch failed', { cause: response.error }))
      return
    }

    // 4. Set responseObject to the result of creating a Response object,
    // given response, "immutable", and relevantRealm.
    responseObject = new WeakRef(fromInnerResponse(response, 'immutable'))

    // 5. Resolve p with responseObject.
    p.resolve(responseObject.deref())
    p = null
  }

  controller = fetching({
    request,
    processResponseEndOfBody: handleFetchDone,
    processResponse,
    dispatcher: getRequestDispatcher(requestObject) // undici
  })

  // 14. Return p.
  return p.promise
}

// https://fetch.spec.whatwg.org/#finalize-and-report-timing
function finalizeAndReportTiming (response, initiatorType = 'other') {
  // 1. If response is an aborted network error, then return.
  if (response.type === 'error' && response.aborted) {
    return
  }

  // 2. If response’s URL list is null or empty, then return.
  if (!response.urlList?.length) {
    return
  }

  // 3. Let originalURL be response’s URL list[0].
  const originalURL = response.urlList[0]

  // 4. Let timingInfo be response’s timing info.
  let timingInfo = response.timingInfo

  // 5. Let cacheState be response’s cache state.
  let cacheState = response.cacheState

  // 6. If originalURL’s scheme is not an HTTP(S) scheme, then return.
  if (!urlIsHttpHttpsScheme(originalURL)) {
    return
  }

  // 7. If timingInfo is null, then return.
  if (timingInfo === null) {
    return
  }

  // 8. If response’s timing allow passed flag is not set, then:
  if (!response.timingAllowPassed) {
    //  1. Set timingInfo to a the result of creating an opaque timing info for timingInfo.
    timingInfo = createOpaqueTimingInfo({
      startTime: timingInfo.startTime
    })

    //  2. Set cacheState to the empty string.
    cacheState = ''
  }

  // 9. Set timingInfo’s end time to the coarsened shared current time
  // given global’s relevant settings object’s cross-origin isolated
  // capability.
  // TODO: given global’s relevant settings object’s cross-origin isolated
  // capability?
  timingInfo.endTime = coarsenedSharedCurrentTime()

  // 10. Set response’s timing info to timingInfo.
  response.timingInfo = timingInfo

  // 11. Mark resource timing for timingInfo, originalURL, initiatorType,
  // global, and cacheState.
  markResourceTiming(
    timingInfo,
    originalURL.href,
    initiatorType,
    globalThis,
    cacheState,
    '', // bodyType
    response.status
  )
}

// https://w3c.github.io/resource-timing/#dfn-mark-resource-timing
const markResourceTiming = performance.markResourceTiming

// https://fetch.spec.whatwg.org/#abort-fetch
function abortFetch (p, request, responseObject, error) {
  // 1. Reject promise with error.
  if (p) {
    // We might have already resolved the promise at this stage
    p.reject(error)
  }

  // 2. If request’s body is not null and is readable, then cancel request’s
  // body with error.
  if (request.body?.stream != null && isReadable(request.body.stream)) {
    request.body.stream.cancel(error).catch((err) => {
      if (err.code === 'ERR_INVALID_STATE') {
        // Node bug?
        return
      }
      throw err
    })
  }

  // 3. If responseObject is null, then return.
  if (responseObject == null) {
    return
  }

  // 4. Let response be responseObject’s response.
  const response = getResponseState(responseObject)

  // 5. If response’s body is not null and is readable, then error response’s
  // body with error.
  if (response.body?.stream != null && isReadable(response.body.stream)) {
    response.body.stream.cancel(error).catch((err) => {
      if (err.code === 'ERR_INVALID_STATE') {
        // Node bug?
        return
      }
      throw err
    })
  }
}

// https://fetch.spec.whatwg.org/#fetching
function fetching ({
  request,
  processRequestBodyChunkLength,
  processRequestEndOfBody,
  processResponse,
  processResponseEndOfBody,
  processResponseConsumeBody,
  useParallelQueue = false,
  dispatcher = getGlobalDispatcher() // undici
}) {
  // Ensure that the dispatcher is set accordingly
  assert(dispatcher)

  // 1. Let taskDestination be null.
  let taskDestination = null

  // 2. Let crossOriginIsolatedCapability be false.
  let crossOriginIsolatedCapability = false

  // 3. If request’s client is non-null, then:
  if (request.client != null) {
    // 1. Set taskDestination to request’s client’s global object.
    taskDestination = request.client.globalObject

    // 2. Set crossOriginIsolatedCapability to request’s client’s cross-origin
    // isolated capability.
    crossOriginIsolatedCapability =
      request.client.crossOriginIsolatedCapability
  }

  // 4. If useParallelQueue is true, then set taskDestination to the result of
  // starting a new parallel queue.
  // TODO

  // 5. Let timingInfo be a new fetch timing info whose start time and
  // post-redirect start time are the coarsened shared current time given
  // crossOriginIsolatedCapability.
  const currentTime = coarsenedSharedCurrentTime(crossOriginIsolatedCapability)
  const timingInfo = createOpaqueTimingInfo({
    startTime: currentTime
  })

  // 6. Let fetchParams be a new fetch params whose
  // request is request,
  // timing info is timingInfo,
  // process request body chunk length is processRequestBodyChunkLength,
  // process request end-of-body is processRequestEndOfBody,
  // process response is processResponse,
  // process response consume body is processResponseConsumeBody,
  // process response end-of-body is processResponseEndOfBody,
  // task destination is taskDestination,
  // and cross-origin isolated capability is crossOriginIsolatedCapability.
  const fetchParams = {
    controller: new Fetch(dispatcher),
    request,
    timingInfo,
    processRequestBodyChunkLength,
    processRequestEndOfBody,
    processResponse,
    processResponseConsumeBody,
    processResponseEndOfBody,
    taskDestination,
    crossOriginIsolatedCapability
  }

  // 7. If request’s body is a byte sequence, then set request’s body to
  //    request’s body as a body.
  // NOTE: Since fetching is only called from fetch, body should already be
  // extracted.
  assert(!request.body || request.body.stream)

  // 8. If request’s window is "client", then set request’s window to request’s
  // client, if request’s client’s global object is a Window object; otherwise
  // "no-window".
  if (request.window === 'client') {
    // TODO: What if request.client is null?
    request.window =
      request.client?.globalObject?.constructor?.name === 'Window'
        ? request.client
        : 'no-window'
  }

  // 9. If request’s origin is "client", then set request’s origin to request’s
  // client’s origin.
  if (request.origin === 'client') {
    request.origin = request.client.origin
  }

  // 10. If all of the following conditions are true:
  // TODO

  // 11. If request’s policy container is "client", then:
  if (request.policyContainer === 'client') {
    // 1. If request’s client is non-null, then set request’s policy
    // container to a clone of request’s client’s policy container. [HTML]
    if (request.client != null) {
      request.policyContainer = clonePolicyContainer(
        request.client.policyContainer
      )
    } else {
      // 2. Otherwise, set request’s policy container to a new policy
      // container.
      request.policyContainer = makePolicyContainer()
    }
  }

  // 12. If request’s header list does not contain `Accept`, then:
  if (!request.headersList.contains('accept', true)) {
    // 1. Let value be `*/*`.
    const value = '*/*'

    // 2. A user agent should set value to the first matching statement, if
    // any, switching on request’s destination:
    // "document"
    // "frame"
    // "iframe"
    // `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`
    // "image"
    // `image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5`
    // "style"
    // `text/css,*/*;q=0.1`
    // TODO

    // 3. Append `Accept`/value to request’s header list.
    request.headersList.append('accept', value, true)
  }

  // 13. If request’s header list does not contain `Accept-Language`, then
  // user agents should append `Accept-Language`/an appropriate value to
  // request’s header list.
  if (!request.headersList.contains('accept-language', true)) {
    request.headersList.append('accept-language', '*', true)
  }

  // 14. If request’s priority is null, then use request’s initiator and
  // destination appropriately in setting request’s priority to a
  // user-agent-defined object.
  if (request.priority === null) {
    // TODO
  }

  // 15. If request is a subresource request, then:
  if (subresourceSet.has(request.destination)) {
    // TODO
  }

  // 16. Run main fetch given fetchParams.
  mainFetch(fetchParams, false)

  // 17. Return fetchParam's controller
  return fetchParams.controller
}

// https://fetch.spec.whatwg.org/#concept-main-fetch
async function mainFetch (fetchParams, recursive) {
  try {
    // 1. Let request be fetchParams’s request.
    const request = fetchParams.request

    // 2. Let response be null.
    let response = null

    // 3. If request’s local-URLs-only flag is set and request’s current URL is
    // not local, then set response to a network error.
    if (request.localURLsOnly && !urlIsLocal(requestCurrentURL(request))) {
      response = makeNetworkError('local URLs only')
    }

    // 4. Run report Content Security Policy violations for request.
    // TODO

    // 5. Upgrade request to a potentially trustworthy URL, if appropriate.
    tryUpgradeRequestToAPotentiallyTrustworthyURL(request)

    // 6. If should request be blocked due to a bad port, should fetching request
    // be blocked as mixed content, or should request be blocked by Content
    // Security Policy returns blocked, then set response to a network error.
    if (requestBadPort(request) === 'blocked') {
      response = makeNetworkError('bad port')
    }
    // TODO: should fetching request be blocked as mixed content?
    // TODO: should request be blocked by Content Security Policy?

    // 7. If request’s referrer policy is the empty string, then set request’s
    // referrer policy to request’s policy container’s referrer policy.
    if (request.referrerPolicy === '') {
      request.referrerPolicy = request.policyContainer.referrerPolicy
    }

    // 8. If request’s referrer is not "no-referrer", then set request’s
    // referrer to the result of invoking determine request’s referrer.
    if (request.referrer !== 'no-referrer') {
      request.referrer = determineRequestsReferrer(request)
    }

    // 9. Set request’s current URL’s scheme to "https" if all of the following
    // conditions are true:
    // - request’s current URL’s scheme is "http"
    // - request’s current URL’s host is a domain
    // - Matching request’s current URL’s host per Known HSTS Host Domain Name
    //   Matching results in either a superdomain match with an asserted
    //   includeSubDomains directive or a congruent match (with or without an
    //   asserted includeSubDomains directive). [HSTS]
    // TODO

    // 10. If recursive is false, then run the remaining steps in parallel.
    // TODO

    // 11. If response is null, then set response to the result of running
    // the steps corresponding to the first matching statement:
    if (response === null) {
      const currentURL = requestCurrentURL(request)
      if (
        // - request’s current URL’s origin is same origin with request’s origin,
        //   and request’s response tainting is "basic"
        (sameOrigin(currentURL, request.url) && request.responseTainting === 'basic') ||
        // request’s current URL’s scheme is "data"
        (currentURL.protocol === 'data:') ||
        // - request’s mode is "navigate" or "websocket"
        (request.mode === 'navigate' || request.mode === 'websocket')
      ) {
        // 1. Set request’s response tainting to "basic".
        request.responseTainting = 'basic'

        // 2. Return the result of running scheme fetch given fetchParams.
        response = await schemeFetch(fetchParams)

      // request’s mode is "same-origin"
      } else if (request.mode === 'same-origin') {
        // 1. Return a network error.
        response = makeNetworkError('request mode cannot be "same-origin"')

      // request’s mode is "no-cors"
      } else if (request.mode === 'no-cors') {
        // 1. If request’s redirect mode is not "follow", then return a network
        // error.
        if (request.redirect !== 'follow') {
          response = makeNetworkError(
            'redirect mode cannot be "follow" for "no-cors" request'
          )
        } else {
          // 2. Set request’s response tainting to "opaque".
          request.responseTainting = 'opaque'

          // 3. Return the result of running scheme fetch given fetchParams.
          response = await schemeFetch(fetchParams)
        }
      // request’s current URL’s scheme is not an HTTP(S) scheme
      } else if (!urlIsHttpHttpsScheme(requestCurrentURL(request))) {
        // Return a network error.
        response = makeNetworkError('URL scheme must be a HTTP(S) scheme')

        // - request’s use-CORS-preflight flag is set
        // - request’s unsafe-request flag is set and either request’s method is
        //   not a CORS-safelisted method or CORS-unsafe request-header names with
        //   request’s header list is not empty
        //    1. Set request’s response tainting to "cors".
        //    2. Let corsWithPreflightResponse be the result of running HTTP fetch
        //    given fetchParams and true.
        //    3. If corsWithPreflightResponse is a network error, then clear cache
        //    entries using request.
        //    4. Return corsWithPreflightResponse.
        // TODO

      // Otherwise
      } else {
        //    1. Set request’s response tainting to "cors".
        request.responseTainting = 'cors'

        //    2. Return the result of running HTTP fetch given fetchParams.
        response = await httpFetch(fetchParams)
      }
    }

    // 12. If recursive is true, then return response.
    if (recursive) {
      return response
    }

    // 13. If response is not a network error and response is not a filtered
    // response, then:
    if (response.status !== 0 && !response.internalResponse) {
      // If request’s response tainting is "cors", then:
      if (request.responseTainting === 'cors') {
        // 1. Let headerNames be the result of extracting header list values
        // given `Access-Control-Expose-Headers` and response’s header list.
        // TODO
        // 2. If request’s credentials mode is not "include" and headerNames
        // contains `*`, then set response’s CORS-exposed header-name list to
        // all unique header names in response’s header list.
        // TODO
        // 3. Otherwise, if headerNames is not null or failure, then set
        // response’s CORS-exposed header-name list to headerNames.
        // TODO
      }

      // Set response to the following filtered response with response as its
      // internal response, depending on request’s response tainting:
      if (request.responseTainting === 'basic') {
        response = filterResponse(response, 'basic')
      } else if (request.responseTainting === 'cors') {
        response = filterResponse(response, 'cors')
      } else if (request.responseTainting === 'opaque') {
        response = filterResponse(response, 'opaque')
      } else {
        assert(false)
      }
    }

    // 14. Let internalResponse be response, if response is a network error,
    // and response’s internal response otherwise.
    let internalResponse =
      response.status === 0 ? response : response.internalResponse

    // 15. If internalResponse’s URL list is empty, then set it to a clone of
    // request’s URL list.
    if (internalResponse.urlList.length === 0) {
      internalResponse.urlList.push(...request.urlList)
    }

    // 16. If request’s timing allow failed flag is unset, then set
    // internalResponse’s timing allow passed flag.
    if (!request.timingAllowFailed) {
      response.timingAllowPassed = true
    }

    // 17. If response is not a network error and any of the following returns
    // blocked
    // - should internalResponse to request be blocked as mixed content
    // - should internalResponse to request be blocked by Content Security Policy
    // - should internalResponse to request be blocked due to its MIME type
    // - should internalResponse to request be blocked due to nosniff
    // TODO

    // 18. If response’s type is "opaque", internalResponse’s status is 206,
    // internalResponse’s range-requested flag is set, and request’s header
    // list does not contain `Range`, then set response and internalResponse
    // to a network error.
    if (
      response.type === 'opaque' &&
      internalResponse.status === 206 &&
      internalResponse.rangeRequested &&
      !request.headers.contains('range', true)
    ) {
      response = internalResponse = makeNetworkError()
    }

    // 19. If response is not a network error and either request’s method is
    // `HEAD` or `CONNECT`, or internalResponse’s status is a null body status,
    // set internalResponse’s body to null and disregard any enqueuing toward
    // it (if any).
    if (
      response.status !== 0 &&
      (request.method === 'HEAD' ||
        request.method === 'CONNECT' ||
        nullBodyStatus.includes(internalResponse.status))
    ) {
      internalResponse.body = null
      fetchParams.controller.dump = true
    }

    // 20. If request’s integrity metadata is not the empty string, then:
    if (request.integrity) {
      // 1. Let processBodyError be this step: run fetch finale given fetchParams
      // and a network error.
      const processBodyError = (reason) =>
        fetchFinale(fetchParams, makeNetworkError(reason))

      // 2. If request’s response tainting is "opaque", or response’s body is null,
      // then run processBodyError and abort these steps.
      if (request.responseTainting === 'opaque' || response.body == null) {
        processBodyError(response.error)
        return
      }

      // 3. Let processBody given bytes be these steps:
      const processBody = (bytes) => {
        // 1. If bytes do not match request’s integrity metadata,
        // then run processBodyError and abort these steps. [SRI]
        if (!bytesMatch(bytes, request.integrity)) {
          processBodyError('integrity mismatch')
          return
        }

        // 2. Set response’s body to bytes as a body.
        response.body = safelyExtractBody(bytes)[0]

        // 3. Run fetch finale given fetchParams and response.
        fetchFinale(fetchParams, response)
      }

      // 4. Fully read response’s body given processBody and processBodyError.
      fullyReadBody(response.body, processBody, processBodyError)
    } else {
      // 21. Otherwise, run fetch finale given fetchParams and response.
      fetchFinale(fetchParams, response)
    }
  } catch (err) {
    fetchParams.controller.terminate(err)
  }
}

// https://fetch.spec.whatwg.org/#concept-scheme-fetch
// given a fetch params fetchParams
function schemeFetch (fetchParams) {
  // Note: since the connection is destroyed on redirect, which sets fetchParams to a
  // cancelled state, we do not want this condition to trigger *unless* there have been
  // no redirects. See https://github.com/nodejs/undici/issues/1776
  // 1. If fetchParams is canceled, then return the appropriate network error for fetchParams.
  if (isCancelled(fetchParams) && fetchParams.request.redirectCount === 0) {
    return Promise.resolve(makeAppropriateNetworkError(fetchParams))
  }

  // 2. Let request be fetchParams’s request.
  const { request } = fetchParams

  const { protocol: scheme } = requestCurrentURL(request)

  // 3. Switch on request’s current URL’s scheme and run the associated steps:
  switch (scheme) {
    case 'about:': {
      // If request’s current URL’s path is the string "blank", then return a new response
      // whose status message is `OK`, header list is « (`Content-Type`, `text/html;charset=utf-8`) »,
      // and body is the empty byte sequence as a body.

      // Otherwise, return a network error.
      return Promise.resolve(makeNetworkError('about scheme is not supported'))
    }
    case 'blob:': {
      if (!resolveObjectURL) {
        resolveObjectURL = require('node:buffer').resolveObjectURL
      }

      // 1. Let blobURLEntry be request’s current URL’s blob URL entry.
      const blobURLEntry = requestCurrentURL(request)

      // https://github.com/web-platform-tests/wpt/blob/7b0ebaccc62b566a1965396e5be7bb2bc06f841f/FileAPI/url/resources/fetch-tests.js#L52-L56
      // Buffer.resolveObjectURL does not ignore URL queries.
      if (blobURLEntry.search.length !== 0) {
        return Promise.resolve(makeNetworkError('NetworkError when attempting to fetch resource.'))
      }

      const blob = resolveObjectURL(blobURLEntry.toString())

      // 2. If request’s method is not `GET`, blobURLEntry is null, or blobURLEntry’s
      //    object is not a Blob object, then return a network error.
      if (request.method !== 'GET' || !webidl.is.Blob(blob)) {
        return Promise.resolve(makeNetworkError('invalid method'))
      }

      // 3. Let blob be blobURLEntry’s object.
      // Note: done above

      // 4. Let response be a new response.
      const response = makeResponse()

      // 5. Let fullLength be blob’s size.
      const fullLength = blob.size

      // 6. Let serializedFullLength be fullLength, serialized and isomorphic encoded.
      const serializedFullLength = isomorphicEncode(`${fullLength}`)

      // 7. Let type be blob’s type.
      const type = blob.type

      // 8. If request’s header list does not contain `Range`:
      // 9. Otherwise:
      if (!request.headersList.contains('range', true)) {
        // 1. Let bodyWithType be the result of safely extracting blob.
        // Note: in the FileAPI a blob "object" is a Blob *or* a MediaSource.
        // In node, this can only ever be a Blob. Therefore we can safely
        // use extractBody directly.
        const bodyWithType = extractBody(blob)

        // 2. Set response’s status message to `OK`.
        response.statusText = 'OK'

        // 3. Set response’s body to bodyWithType’s body.
        response.body = bodyWithType[0]

        // 4. Set response’s header list to « (`Content-Length`, serializedFullLength), (`Content-Type`, type) ».
        response.headersList.set('content-length', serializedFullLength, true)
        response.headersList.set('content-type', type, true)
      } else {
        // 1. Set response’s range-requested flag.
        response.rangeRequested = true

        // 2. Let rangeHeader be the result of getting `Range` from request’s header list.
        const rangeHeader = request.headersList.get('range', true)

        // 3. Let rangeValue be the result of parsing a single range header value given rangeHeader and true.
        const rangeValue = simpleRangeHeaderValue(rangeHeader, true)

        // 4. If rangeValue is failure, then return a network error.
        if (rangeValue === 'failure') {
          return Promise.resolve(makeNetworkError('failed to fetch the data URL'))
        }

        // 5. Let (rangeStart, rangeEnd) be rangeValue.
        let { rangeStartValue: rangeStart, rangeEndValue: rangeEnd } = rangeValue

        // 6. If rangeStart is null:
        // 7. Otherwise:
        if (rangeStart === null) {
          // 1. Set rangeStart to fullLength − rangeEnd.
          rangeStart = fullLength - rangeEnd

          // 2. Set rangeEnd to rangeStart + rangeEnd − 1.
          rangeEnd = rangeStart + rangeEnd - 1
        } else {
          // 1. If rangeStart is greater than or equal to fullLength, then return a network error.
          if (rangeStart >= fullLength) {
            return Promise.resolve(makeNetworkError('Range start is greater than the blob\'s size.'))
          }

          // 2. If rangeEnd is null or rangeEnd is greater than or equal to fullLength, then set
          //    rangeEnd to fullLength − 1.
          if (rangeEnd === null || rangeEnd >= fullLength) {
            rangeEnd = fullLength - 1
          }
        }

        // 8. Let slicedBlob be the result of invoking slice blob given blob, rangeStart,
        //    rangeEnd + 1, and type.
        const slicedBlob = blob.slice(rangeStart, rangeEnd + 1, type)

        // 9. Let slicedBodyWithType be the result of safely extracting slicedBlob.
        // Note: same reason as mentioned above as to why we use extractBody
        const slicedBodyWithType = extractBody(slicedBlob)

        // 10. Set response’s body to slicedBodyWithType’s body.
        response.body = slicedBodyWithType[0]

        // 11. Let serializedSlicedLength be slicedBlob’s size, serialized and isomorphic encoded.
        const serializedSlicedLength = isomorphicEncode(`${slicedBlob.size}`)

        // 12. Let contentRange be the result of invoking build a content range given rangeStart,
        //     rangeEnd, and fullLength.
        const contentRange = buildContentRange(rangeStart, rangeEnd, fullLength)

        // 13. Set response’s status to 206.
        response.status = 206

        // 14. Set response’s status message to `Partial Content`.
        response.statusText = 'Partial Content'

        // 15. Set response’s header list to « (`Content-Length`, serializedSlicedLength),
        //     (`Content-Type`, type), (`Content-Range`, contentRange) ».
        response.headersList.set('content-length', serializedSlicedLength, true)
        response.headersList.set('content-type', type, true)
        response.headersList.set('content-range', contentRange, true)
      }

      // 10. Return response.
      return Promise.resolve(response)
    }
    case 'data:': {
      // 1. Let dataURLStruct be the result of running the
      //    data: URL processor on request’s current URL.
      const currentURL = requestCurrentURL(request)
      const dataURLStruct = dataURLProcessor(currentURL)

      // 2. If dataURLStruct is failure, then return a
      //    network error.
      if (dataURLStruct === 'failure') {
        return Promise.resolve(makeNetworkError('failed to fetch the data URL'))
      }

      // 3. Let mimeType be dataURLStruct’s MIME type, serialized.
      const mimeType = serializeAMimeType(dataURLStruct.mimeType)

      // 4. Return a response whose status message is `OK`,
      //    header list is « (`Content-Type`, mimeType) »,
      //    and body is dataURLStruct’s body as a body.
      return Promise.resolve(makeResponse({
        statusText: 'OK',
        headersList: [
          ['content-type', { name: 'Content-Type', value: mimeType }]
        ],
        body: safelyExtractBody(dataURLStruct.body)[0]
      }))
    }
    case 'file:': {
      // For now, unfortunate as it is, file URLs are left as an exercise for the reader.
      // When in doubt, return a network error.
      return Promise.resolve(makeNetworkError('not implemented... yet...'))
    }
    case 'http:':
    case 'https:': {
      // Return the result of running HTTP fetch given fetchParams.

      return httpFetch(fetchParams)
        .catch((err) => makeNetworkError(err))
    }
    default: {
      return Promise.resolve(makeNetworkError('unknown scheme'))
    }
  }
}

// https://fetch.spec.whatwg.org/#finalize-response
function finalizeResponse (fetchParams, response) {
  // 1. Set fetchParams’s request’s done flag.
  fetchParams.request.done = true

  // 2, If fetchParams’s process response done is not null, then queue a fetch
  // task to run fetchParams’s process response done given response, with
  // fetchParams’s task destination.
  if (fetchParams.processResponseDone != null) {
    queueMicrotask(() => fetchParams.processResponseDone(response))
  }
}

// https://fetch.spec.whatwg.org/#fetch-finale
function fetchFinale (fetchParams, response) {
  // 1. Let timingInfo be fetchParams’s timing info.
  let timingInfo = fetchParams.timingInfo

  // 2. If response is not a network error and fetchParams’s request’s client is a secure context,
  //    then set timingInfo’s server-timing headers to the result of getting, decoding, and splitting
  //    `Server-Timing` from response’s internal response’s header list.
  // TODO

  // 3. Let processResponseEndOfBody be the following steps:
  const processResponseEndOfBody = () => {
    // 1. Let unsafeEndTime be the unsafe shared current time.
    const unsafeEndTime = Date.now() // ?

    // 2. If fetchParams’s request’s destination is "document", then set fetchParams’s controller’s
    //    full timing info to fetchParams’s timing info.
    if (fetchParams.request.destination === 'document') {
      fetchParams.controller.fullTimingInfo = timingInfo
    }

    // 3. Set fetchParams’s controller’s report timing steps to the following steps given a global object global:
    fetchParams.controller.reportTimingSteps = () => {
      // 1. If fetchParams’s request’s URL’s scheme is not an HTTP(S) scheme, then return.
      if (!urlIsHttpHttpsScheme(fetchParams.request.url)) {
        return
      }

      // 2. Set timingInfo’s end time to the relative high resolution time given unsafeEndTime and global.
      timingInfo.endTime = unsafeEndTime

      // 3. Let cacheState be response’s cache state.
      let cacheState = response.cacheState

      // 4. Let bodyInfo be response’s body info.
      const bodyInfo = response.bodyInfo

      // 5. If response’s timing allow passed flag is not set, then set timingInfo to the result of creating an
      //    opaque timing info for timingInfo and set cacheState to the empty string.
      if (!response.timingAllowPassed) {
        timingInfo = createOpaqueTimingInfo(timingInfo)

        cacheState = ''
      }

      // 6. Let responseStatus be 0.
      let responseStatus = 0

      // 7. If fetchParams’s request’s mode is not "navigate" or response’s has-cross-origin-redirects is false:
      if (fetchParams.request.mode !== 'navigator' || !response.hasCrossOriginRedirects) {
        // 1. Set responseStatus to response’s status.
        responseStatus = response.status

        // 2. Let mimeType be the result of extracting a MIME type from response’s header list.
        const mimeType = extractMimeType(response.headersList)

        // 3. If mimeType is not failure, then set bodyInfo’s content type to the result of minimizing a supported MIME type given mimeType.
        if (mimeType !== 'failure') {
          bodyInfo.contentType = minimizeSupportedMimeType(mimeType)
        }
      }

      // 8. If fetchParams’s request’s initiator type is non-null, then mark resource timing given timingInfo,
      //    fetchParams’s request’s URL, fetchParams’s request’s initiator type, global, cacheState, bodyInfo,
      //    and responseStatus.
      if (fetchParams.request.initiatorType != null) {
        markResourceTiming(timingInfo, fetchParams.request.url.href, fetchParams.request.initiatorType, globalThis, cacheState, bodyInfo, responseStatus)
      }
    }

    // 4. Let processResponseEndOfBodyTask be the following steps:
    const processResponseEndOfBodyTask = () => {
      // 1. Set fetchParams’s request’s done flag.
      fetchParams.request.done = true

      // 2. If fetchParams’s process response end-of-body is non-null, then run fetchParams’s process
      //    response end-of-body given response.
      if (fetchParams.processResponseEndOfBody != null) {
        queueMicrotask(() => fetchParams.processResponseEndOfBody(response))
      }

      // 3. If fetchParams’s request’s initiator type is non-null and fetchParams’s request’s client’s
      //    global object is fetchParams’s task destination, then run fetchParams’s controller’s report
      //    timing steps given fetchParams’s request’s client’s global object.
      if (fetchParams.request.initiatorType != null) {
        fetchParams.controller.reportTimingSteps()
      }
    }

    // 5. Queue a fetch task to run processResponseEndOfBodyTask with fetchParams’s task destination
    queueMicrotask(() => processResponseEndOfBodyTask())
  }

  // 4. If fetchParams’s process response is non-null, then queue a fetch task to run fetchParams’s
  //    process response given response, with fetchParams’s task destination.
  if (fetchParams.processResponse != null) {
    queueMicrotask(() => {
      fetchParams.processResponse(response)
      fetchParams.processResponse = null
    })
  }

  // 5. Let internalResponse be response, if response is a network error; otherwise response’s internal response.
  const internalResponse = response.type === 'error' ? response : (response.internalResponse ?? response)

  // 6. If internalResponse’s body is null, then run processResponseEndOfBody.
  // 7. Otherwise:
  if (internalResponse.body == null) {
    processResponseEndOfBody()
  } else {
    // mcollina: all the following steps of the specs are skipped.
    // The internal transform stream is not needed.
    // See https://github.com/nodejs/undici/pull/3093#issuecomment-2050198541

    // 1. Let transformStream be a new TransformStream.
    // 2. Let identityTransformAlgorithm be an algorithm which, given chunk, enqueues chunk in transformStream.
    // 3. Set up transformStream with transformAlgorithm set to identityTransformAlgorithm and flushAlgorithm
    //    set to processResponseEndOfBody.
    // 4. Set internalResponse’s body’s stream to the result of internalResponse’s body’s stream piped through transformStream.

    finished(internalResponse.body.stream, () => {
      processResponseEndOfBody()
    })
  }
}

// https://fetch.spec.whatwg.org/#http-fetch
async function httpFetch (fetchParams) {
  // 1. Let request be fetchParams’s request.
  const request = fetchParams.request

  // 2. Let response be null.
  let response = null

  // 3. Let actualResponse be null.
  let actualResponse = null

  // 4. Let timingInfo be fetchParams’s timing info.
  const timingInfo = fetchParams.timingInfo

  // 5. If request’s service-workers mode is "all", then:
  if (request.serviceWorkers === 'all') {
    // TODO
  }

  // 6. If response is null, then:
  if (response === null) {
    // 1. If makeCORSPreflight is true and one of these conditions is true:
    // TODO

    // 2. If request’s redirect mode is "follow", then set request’s
    // service-workers mode to "none".
    if (request.redirect === 'follow') {
      request.serviceWorkers = 'none'
    }

    // 3. Set response and actualResponse to the result of running
    // HTTP-network-or-cache fetch given fetchParams.
    actualResponse = response = await httpNetworkOrCacheFetch(fetchParams)

    // 4. If request’s response tainting is "cors" and a CORS check
    // for request and response returns failure, then return a network error.
    if (
      request.responseTainting === 'cors' &&
      corsCheck(request, response) === 'failure'
    ) {
      return makeNetworkError('cors failure')
    }

    // 5. If the TAO check for request and response returns failure, then set
    // request’s timing allow failed flag.
    if (TAOCheck(request, response) === 'failure') {
      request.timingAllowFailed = true
    }
  }

  // 7. If either request’s response tainting or response’s type
  // is "opaque", and the cross-origin resource policy check with
  // request’s origin, request’s client, request’s destination,
  // and actualResponse returns blocked, then return a network error.
  if (
    (request.responseTainting === 'opaque' || response.type === 'opaque') &&
    crossOriginResourcePolicyCheck(
      request.origin,
      request.client,
      request.destination,
      actualResponse
    ) === 'blocked'
  ) {
    return makeNetworkError('blocked')
  }

  // 8. If actualResponse’s status is a redirect status, then:
  if (redirectStatusSet.has(actualResponse.status)) {
    // 1. If actualResponse’s status is not 303, request’s body is not null,
    // and the connection uses HTTP/2, then user agents may, and are even
    // encouraged to, transmit an RST_STREAM frame.
    // See, https://github.com/whatwg/fetch/issues/1288
    if (request.redirect !== 'manual') {
      fetchParams.controller.connection.destroy(undefined, false)
    }

    // 2. Switch on request’s redirect mode:
    if (request.redirect === 'error') {
      // Set response to a network error.
      response = makeNetworkError('unexpected redirect')
    } else if (request.redirect === 'manual') {
      // Set response to an opaque-redirect filtered response whose internal
      // response is actualResponse.
      // NOTE(spec): On the web this would return an `opaqueredirect` response,
      // but that doesn't make sense server side.
      // See https://github.com/nodejs/undici/issues/1193.
      response = actualResponse
    } else if (request.redirect === 'follow') {
      // Set response to the result of running HTTP-redirect fetch given
      // fetchParams and response.
      response = await httpRedirectFetch(fetchParams, response)
    } else {
      assert(false)
    }
  }

  // 9. Set response’s timing info to timingInfo.
  response.timingInfo = timingInfo

  // 10. Return response.
  return response
}

// https://fetch.spec.whatwg.org/#http-redirect-fetch
function httpRedirectFetch (fetchParams, response) {
  // 1. Let request be fetchParams’s request.
  const request = fetchParams.request

  // 2. Let actualResponse be response, if response is not a filtered response,
  // and response’s internal response otherwise.
  const actualResponse = response.internalResponse
    ? response.internalResponse
    : response

  // 3. Let locationURL be actualResponse’s location URL given request’s current
  // URL’s fragment.
  let locationURL

  try {
    locationURL = responseLocationURL(
      actualResponse,
      requestCurrentURL(request).hash
    )

    // 4. If locationURL is null, then return response.
    if (locationURL == null) {
      return response
    }
  } catch (err) {
    // 5. If locationURL is failure, then return a network error.
    return Promise.resolve(makeNetworkError(err))
  }

  // 6. If locationURL’s scheme is not an HTTP(S) scheme, then return a network
  // error.
  if (!urlIsHttpHttpsScheme(locationURL)) {
    return Promise.resolve(makeNetworkError('URL scheme must be a HTTP(S) scheme'))
  }

  // 7. If request’s redirect count is 20, then return a network error.
  if (request.redirectCount === 20) {
    return Promise.resolve(makeNetworkError('redirect count exceeded'))
  }

  // 8. Increase request’s redirect count by 1.
  request.redirectCount += 1

  // 9. If request’s mode is "cors", locationURL includes credentials, and
  // request’s origin is not same origin with locationURL’s origin, then return
  //  a network error.
  if (
    request.mode === 'cors' &&
    (locationURL.username || locationURL.password) &&
    !sameOrigin(request, locationURL)
  ) {
    return Promise.resolve(makeNetworkError('cross origin not allowed for request mode "cors"'))
  }

  // 10. If request’s response tainting is "cors" and locationURL includes
  // credentials, then return a network error.
  if (
    request.responseTainting === 'cors' &&
    (locationURL.username || locationURL.password)
  ) {
    return Promise.resolve(makeNetworkError(
      'URL cannot contain credentials for request mode "cors"'
    ))
  }

  // 11. If actualResponse’s status is not 303, request’s body is non-null,
  // and request’s body’s source is null, then return a network error.
  if (
    actualResponse.status !== 303 &&
    request.body != null &&
    request.body.source == null
  ) {
    return Promise.resolve(makeNetworkError())
  }

  // 12. If one of the following is true
  // - actualResponse’s status is 301 or 302 and request’s method is `POST`
  // - actualResponse’s status is 303 and request’s method is not `GET` or `HEAD`
  if (
    ([301, 302].includes(actualResponse.status) && request.method === 'POST') ||
    (actualResponse.status === 303 &&
      !GET_OR_HEAD.includes(request.method))
  ) {
    // then:
    // 1. Set request’s method to `GET` and request’s body to null.
    request.method = 'GET'
    request.body = null

    // 2. For each headerName of request-body-header name, delete headerName from
    // request’s header list.
    for (const headerName of requestBodyHeader) {
      request.headersList.delete(headerName)
    }
  }

  // 13. If request’s current URL’s origin is not same origin with locationURL’s
  //     origin, then for each headerName of CORS non-wildcard request-header name,
  //     delete headerName from request’s header list.
  if (!sameOrigin(requestCurrentURL(request), locationURL)) {
    // https://fetch.spec.whatwg.org/#cors-non-wildcard-request-header-name
    request.headersList.delete('authorization', true)

    // https://fetch.spec.whatwg.org/#authentication-entries
    request.headersList.delete('proxy-authorization', true)

    // "Cookie" and "Host" are forbidden request-headers, which undici doesn't implement.
    request.headersList.delete('cookie', true)
    request.headersList.delete('host', true)
  }

  // 14. If request’s body is non-null, then set request’s body to the first return
  // value of safely extracting request’s body’s source.
  if (request.body != null) {
    assert(request.body.source != null)
    request.body = safelyExtractBody(request.body.source)[0]
  }

  // 15. Let timingInfo be fetchParams’s timing info.
  const timingInfo = fetchParams.timingInfo

  // 16. Set timingInfo’s redirect end time and post-redirect start time to the
  // coarsened shared current time given fetchParams’s cross-origin isolated
  // capability.
  timingInfo.redirectEndTime = timingInfo.postRedirectStartTime =
    coarsenedSharedCurrentTime(fetchParams.crossOriginIsolatedCapability)

  // 17. If timingInfo’s redirect start time is 0, then set timingInfo’s
  //  redirect start time to timingInfo’s start time.
  if (timingInfo.redirectStartTime === 0) {
    timingInfo.redirectStartTime = timingInfo.startTime
  }

  // 18. Append locationURL to request’s URL list.
  request.urlList.push(locationURL)

  // 19. Invoke set request’s referrer policy on redirect on request and
  // actualResponse.
  setRequestReferrerPolicyOnRedirect(request, actualResponse)

  // 20. Return the result of running main fetch given fetchParams and true.
  return mainFetch(fetchParams, true)
}

// https://fetch.spec.whatwg.org/#http-network-or-cache-fetch
async function httpNetworkOrCacheFetch (
  fetchParams,
  isAuthenticationFetch = false,
  isNewConnectionFetch = false
) {
  // 1. Let request be fetchParams’s request.
  const request = fetchParams.request

  // 2. Let httpFetchParams be null.
  let httpFetchParams = null

  // 3. Let httpRequest be null.
  let httpRequest = null

  // 4. Let response be null.
  let response = null

  // 5. Let storedResponse be null.
  // TODO: cache

  // 6. Let httpCache be null.
  const httpCache = null

  // 7. Let the revalidatingFlag be unset.
  const revalidatingFlag = false

  // 8. Run these steps, but abort when the ongoing fetch is terminated:

  //    1. If request’s window is "no-window" and request’s redirect mode is
  //    "error", then set httpFetchParams to fetchParams and httpRequest to
  //    request.
  if (request.window === 'no-window' && request.redirect === 'error') {
    httpFetchParams = fetchParams
    httpRequest = request
  } else {
    // Otherwise:

    // 1. Set httpRequest to a clone of request.
    httpRequest = cloneRequest(request)

    // 2. Set httpFetchParams to a copy of fetchParams.
    httpFetchParams = { ...fetchParams }

    // 3. Set httpFetchParams’s request to httpRequest.
    httpFetchParams.request = httpRequest
  }

  //    3. Let includeCredentials be true if one of
  const includeCredentials =
    request.credentials === 'include' ||
    (request.credentials === 'same-origin' &&
      request.responseTainting === 'basic')

  //    4. Let contentLength be httpRequest’s body’s length, if httpRequest’s
  //    body is non-null; otherwise null.
  const contentLength = httpRequest.body ? httpRequest.body.length : null

  //    5. Let contentLengthHeaderValue be null.
  let contentLengthHeaderValue = null

  //    6. If httpRequest’s body is null and httpRequest’s method is `POST` or
  //    `PUT`, then set contentLengthHeaderValue to `0`.
  if (
    httpRequest.body == null &&
    ['POST', 'PUT'].includes(httpRequest.method)
  ) {
    contentLengthHeaderValue = '0'
  }

  //    7. If contentLength is non-null, then set contentLengthHeaderValue to
  //    contentLength, serialized and isomorphic encoded.
  if (contentLength != null) {
    contentLengthHeaderValue = isomorphicEncode(`${contentLength}`)
  }

  //    8. If contentLengthHeaderValue is non-null, then append
  //    `Content-Length`/contentLengthHeaderValue to httpRequest’s header
  //    list.
  if (contentLengthHeaderValue != null) {
    httpRequest.headersList.append('content-length', contentLengthHeaderValue, true)
  }

  //    9. If contentLengthHeaderValue is non-null, then append (`Content-Length`,
  //    contentLengthHeaderValue) to httpRequest’s header list.

  //    10. If contentLength is non-null and httpRequest’s keepalive is true,
  //    then:
  if (contentLength != null && httpRequest.keepalive) {
    // NOTE: keepalive is a noop outside of browser context.
  }

  //    11. If httpRequest’s referrer is a URL, then append
  //    `Referer`/httpRequest’s referrer, serialized and isomorphic encoded,
  //     to httpRequest’s header list.
  if (webidl.is.URL(httpRequest.referrer)) {
    httpRequest.headersList.append('referer', isomorphicEncode(httpRequest.referrer.href), true)
  }

  //    12. Append a request `Origin` header for httpRequest.
  appendRequestOriginHeader(httpRequest)

  //    13. Append the Fetch metadata headers for httpRequest. [FETCH-METADATA]
  appendFetchMetadata(httpRequest)

  //    14. If httpRequest’s header list does not contain `User-Agent`, then
  //    user agents should append `User-Agent`/default `User-Agent` value to
  //    httpRequest’s header list.
  if (!httpRequest.headersList.contains('user-agent', true)) {
    httpRequest.headersList.append('user-agent', defaultUserAgent, true)
  }

  //    15. If httpRequest’s cache mode is "default" and httpRequest’s header
  //    list contains `If-Modified-Since`, `If-None-Match`,
  //    `If-Unmodified-Since`, `If-Match`, or `If-Range`, then set
  //    httpRequest’s cache mode to "no-store".
  if (
    httpRequest.cache === 'default' &&
    (httpRequest.headersList.contains('if-modified-since', true) ||
      httpRequest.headersList.contains('if-none-match', true) ||
      httpRequest.headersList.contains('if-unmodified-since', true) ||
      httpRequest.headersList.contains('if-match', true) ||
      httpRequest.headersList.contains('if-range', true))
  ) {
    httpRequest.cache = 'no-store'
  }

  //    16. If httpRequest’s cache mode is "no-cache", httpRequest’s prevent
  //    no-cache cache-control header modification flag is unset, and
  //    httpRequest’s header list does not contain `Cache-Control`, then append
  //    `Cache-Control`/`max-age=0` to httpRequest’s header list.
  if (
    httpRequest.cache === 'no-cache' &&
    !httpRequest.preventNoCacheCacheControlHeaderModification &&
    !httpRequest.headersList.contains('cache-control', true)
  ) {
    httpRequest.headersList.append('cache-control', 'max-age=0', true)
  }

  //    17. If httpRequest’s cache mode is "no-store" or "reload", then:
  if (httpRequest.cache === 'no-store' || httpRequest.cache === 'reload') {
    // 1. If httpRequest’s header list does not contain `Pragma`, then append
    // `Pragma`/`no-cache` to httpRequest’s header list.
    if (!httpRequest.headersList.contains('pragma', true)) {
      httpRequest.headersList.append('pragma', 'no-cache', true)
    }

    // 2. If httpRequest’s header list does not contain `Cache-Control`,
    // then append `Cache-Control`/`no-cache` to httpRequest’s header list.
    if (!httpRequest.headersList.contains('cache-control', true)) {
      httpRequest.headersList.append('cache-control', 'no-cache', true)
    }
  }

  //    18. If httpRequest’s header list contains `Range`, then append
  //    `Accept-Encoding`/`identity` to httpRequest’s header list.
  if (httpRequest.headersList.contains('range', true)) {
    httpRequest.headersList.append('accept-encoding', 'identity', true)
  }

  //    19. Modify httpRequest’s header list per HTTP. Do not append a given
  //    header if httpRequest’s header list contains that header’s name.
  //    TODO: https://github.com/whatwg/fetch/issues/1285#issuecomment-896560129
  if (!httpRequest.headersList.contains('accept-encoding', true)) {
    if (urlHasHttpsScheme(requestCurrentURL(httpRequest))) {
      httpRequest.headersList.append('accept-encoding', 'br, gzip, deflate', true)
    } else {
      httpRequest.headersList.append('accept-encoding', 'gzip, deflate', true)
    }
  }

  httpRequest.headersList.delete('host', true)

  //    20. If includeCredentials is true, then:
  if (includeCredentials) {
    // 1. If the user agent is not configured to block cookies for httpRequest
    // (see section 7 of [COOKIES]), then:
    // TODO: credentials
    // 2. If httpRequest’s header list does not contain `Authorization`, then:
    // TODO: credentials
  }

  //    21. If there’s a proxy-authentication entry, use it as appropriate.
  //    TODO: proxy-authentication

  //    22. Set httpCache to the result of determining the HTTP cache
  //    partition, given httpRequest.
  //    TODO: cache

  //    23. If httpCache is null, then set httpRequest’s cache mode to
  //    "no-store".
  if (httpCache == null) {
    httpRequest.cache = 'no-store'
  }

  //    24. If httpRequest’s cache mode is neither "no-store" nor "reload",
  //    then:
  if (httpRequest.cache !== 'no-store' && httpRequest.cache !== 'reload') {
    // TODO: cache
  }

  // 9. If aborted, then return the appropriate network error for fetchParams.
  // TODO

  // 10. If response is null, then:
  if (response == null) {
    // 1. If httpRequest’s cache mode is "only-if-cached", then return a
    // network error.
    if (httpRequest.cache === 'only-if-cached') {
      return makeNetworkError('only if cached')
    }

    // 2. Let forwardResponse be the result of running HTTP-network fetch
    // given httpFetchParams, includeCredentials, and isNewConnectionFetch.
    const forwardResponse = await httpNetworkFetch(
      httpFetchParams,
      includeCredentials,
      isNewConnectionFetch
    )

    // 3. If httpRequest’s method is unsafe and forwardResponse’s status is
    // in the range 200 to 399, inclusive, invalidate appropriate stored
    // responses in httpCache, as per the "Invalidation" chapter of HTTP
    // Caching, and set storedResponse to null. [HTTP-CACHING]
    if (
      !safeMethodsSet.has(httpRequest.method) &&
      forwardResponse.status >= 200 &&
      forwardResponse.status <= 399
    ) {
      // TODO: cache
    }

    // 4. If the revalidatingFlag is set and forwardResponse’s status is 304,
    // then:
    if (revalidatingFlag && forwardResponse.status === 304) {
      // TODO: cache
    }

    // 5. If response is null, then:
    if (response == null) {
      // 1. Set response to forwardResponse.
      response = forwardResponse

      // 2. Store httpRequest and forwardResponse in httpCache, as per the
      // "Storing Responses in Caches" chapter of HTTP Caching. [HTTP-CACHING]
      // TODO: cache
    }
  }

  // 11. Set response’s URL list to a clone of httpRequest’s URL list.
  response.urlList = [...httpRequest.urlList]

  // 12. If httpRequest’s header list contains `Range`, then set response’s
  // range-requested flag.
  if (httpRequest.headersList.contains('range', true)) {
    response.rangeRequested = true
  }

  // 13. Set response’s request-includes-credentials to includeCredentials.
  response.requestIncludesCredentials = includeCredentials

  // 14. If response’s status is 401, httpRequest’s response tainting is not
  // "cors", includeCredentials is true, and request’s window is an environment
  // settings object, then:
  // TODO

  // 15. If response’s status is 407, then:
  if (response.status === 407) {
    // 1. If request’s window is "no-window", then return a network error.
    if (request.window === 'no-window') {
      return makeNetworkError()
    }

    // 2. ???

    // 3. If fetchParams is canceled, then return the appropriate network error for fetchParams.
    if (isCancelled(fetchParams)) {
      return makeAppropriateNetworkError(fetchParams)
    }

    // 4. Prompt the end user as appropriate in request’s window and store
    // the result as a proxy-authentication entry. [HTTP-AUTH]
    // TODO: Invoke some kind of callback?

    // 5. Set response to the result of running HTTP-network-or-cache fetch given
    // fetchParams.
    // TODO
    return makeNetworkError('proxy authentication required')
  }

  // 16. If all of the following are true
  if (
    // response’s status is 421
    response.status === 421 &&
    // isNewConnectionFetch is false
    !isNewConnectionFetch &&
    // request’s body is null, or request’s body is non-null and request’s body’s source is non-null
    (request.body == null || request.body.source != null)
  ) {
    // then:

    // 1. If fetchParams is canceled, then return the appropriate network error for fetchParams.
    if (isCancelled(fetchParams)) {
      return makeAppropriateNetworkError(fetchParams)
    }

    // 2. Set response to the result of running HTTP-network-or-cache
    // fetch given fetchParams, isAuthenticationFetch, and true.

    // TODO (spec): The spec doesn't specify this but we need to cancel
    // the active response before we can start a new one.
    // https://github.com/whatwg/fetch/issues/1293
    fetchParams.controller.connection.destroy()

    response = await httpNetworkOrCacheFetch(
      fetchParams,
      isAuthenticationFetch,
      true
    )
  }

  // 17. If isAuthenticationFetch is true, then create an authentication entry
  if (isAuthenticationFetch) {
    // TODO
  }

  // 18. Return response.
  return response
}

// https://fetch.spec.whatwg.org/#http-network-fetch
async function httpNetworkFetch (
  fetchParams,
  includeCredentials = false,
  forceNewConnection = false
) {
  assert(!fetchParams.controller.connection || fetchParams.controller.connection.destroyed)

  fetchParams.controller.connection = {
    abort: null,
    destroyed: false,
    destroy (err, abort = true) {
      if (!this.destroyed) {
        this.destroyed = true
        if (abort) {
          this.abort?.(err ?? new DOMException('The operation was aborted.', 'AbortError'))
        }
      }
    }
  }

  // 1. Let request be fetchParams’s request.
  const request = fetchParams.request

  // 2. Let response be null.
  let response = null

  // 3. Let timingInfo be fetchParams’s timing info.
  const timingInfo = fetchParams.timingInfo

  // 4. Let httpCache be the result of determining the HTTP cache partition,
  // given request.
  // TODO: cache
  const httpCache = null

  // 5. If httpCache is null, then set request’s cache mode to "no-store".
  if (httpCache == null) {
    request.cache = 'no-store'
  }

  // 6. Let networkPartitionKey be the result of determining the network
  // partition key given request.
  // TODO

  // 7. Let newConnection be "yes" if forceNewConnection is true; otherwise
  // "no".
  const newConnection = forceNewConnection ? 'yes' : 'no' // eslint-disable-line no-unused-vars

  // 8. Switch on request’s mode:
  if (request.mode === 'websocket') {
    // Let connection be the result of obtaining a WebSocket connection,
    // given request’s current URL.
    // TODO
  } else {
    // Let connection be the result of obtaining a connection, given
    // networkPartitionKey, request’s current URL’s origin,
    // includeCredentials, and forceNewConnection.
    // TODO
  }

  // 9. Run these steps, but abort when the ongoing fetch is terminated:

  //    1. If connection is failure, then return a network error.

  //    2. Set timingInfo’s final connection timing info to the result of
  //    calling clamp and coarsen connection timing info with connection’s
  //    timing info, timingInfo’s post-redirect start time, and fetchParams’s
  //    cross-origin isolated capability.

  //    3. If connection is not an HTTP/2 connection, request’s body is non-null,
  //    and request’s body’s source is null, then append (`Transfer-Encoding`,
  //    `chunked`) to request’s header list.

  //    4. Set timingInfo’s final network-request start time to the coarsened
  //    shared current time given fetchParams’s cross-origin isolated
  //    capability.

  //    5. Set response to the result of making an HTTP request over connection
  //    using request with the following caveats:

  //        - Follow the relevant requirements from HTTP. [HTTP] [HTTP-SEMANTICS]
  //        [HTTP-COND] [HTTP-CACHING] [HTTP-AUTH]

  //        - If request’s body is non-null, and request’s body’s source is null,
  //        then the user agent may have a buffer of up to 64 kibibytes and store
  //        a part of request’s body in that buffer. If the user agent reads from
  //        request’s body beyond that buffer’s size and the user agent needs to
  //        resend request, then instead return a network error.

  //        - Set timingInfo’s final network-response start time to the coarsened
  //        shared current time given fetchParams’s cross-origin isolated capability,
  //        immediately after the user agent’s HTTP parser receives the first byte
  //        of the response (e.g., frame header bytes for HTTP/2 or response status
  //        line for HTTP/1.x).

  //        - Wait until all the headers are transmitted.

  //        - Any responses whose status is in the range 100 to 199, inclusive,
  //        and is not 101, are to be ignored, except for the purposes of setting
  //        timingInfo’s final network-response start time above.

  //    - If request’s header list contains `Transfer-Encoding`/`chunked` and
  //    response is transferred via HTTP/1.0 or older, then return a network
  //    error.

  //    - If the HTTP request results in a TLS client certificate dialog, then:

  //        1. If request’s window is an environment settings object, make the
  //        dialog available in request’s window.

  //        2. Otherwise, return a network error.

  // To transmit request’s body body, run these steps:
  let requestBody = null
  // 1. If body is null and fetchParams’s process request end-of-body is
  // non-null, then queue a fetch task given fetchParams’s process request
  // end-of-body and fetchParams’s task destination.
  if (request.body == null && fetchParams.processRequestEndOfBody) {
    queueMicrotask(() => fetchParams.processRequestEndOfBody())
  } else if (request.body != null) {
    // 2. Otherwise, if body is non-null:

    //    1. Let processBodyChunk given bytes be these steps:
    const processBodyChunk = async function * (bytes) {
      // 1. If the ongoing fetch is terminated, then abort these steps.
      if (isCancelled(fetchParams)) {
        return
      }

      // 2. Run this step in parallel: transmit bytes.
      yield bytes

      // 3. If fetchParams’s process request body is non-null, then run
      // fetchParams’s process request body given bytes’s length.
      fetchParams.processRequestBodyChunkLength?.(bytes.byteLength)
    }

    // 2. Let processEndOfBody be these steps:
    const processEndOfBody = () => {
      // 1. If fetchParams is canceled, then abort these steps.
      if (isCancelled(fetchParams)) {
        return
      }

      // 2. If fetchParams’s process request end-of-body is non-null,
      // then run fetchParams’s process request end-of-body.
      if (fetchParams.processRequestEndOfBody) {
        fetchParams.processRequestEndOfBody()
      }
    }

    // 3. Let processBodyError given e be these steps:
    const processBodyError = (e) => {
      // 1. If fetchParams is canceled, then abort these steps.
      if (isCancelled(fetchParams)) {
        return
      }

      // 2. If e is an "AbortError" DOMException, then abort fetchParams’s controller.
      if (e.name === 'AbortError') {
        fetchParams.controller.abort()
      } else {
        fetchParams.controller.terminate(e)
      }
    }

    // 4. Incrementally read request’s body given processBodyChunk, processEndOfBody,
    // processBodyError, and fetchParams’s task destination.
    requestBody = (async function * () {
      try {
        for await (const bytes of request.body.stream) {
          yield * processBodyChunk(bytes)
        }
        processEndOfBody()
      } catch (err) {
        processBodyError(err)
      }
    })()
  }

  try {
    // socket is only provided for websockets
    const { body, status, statusText, headersList, socket } = await dispatch({ body: requestBody })

    if (socket) {
      response = makeResponse({ status, statusText, headersList, socket })
    } else {
      const iterator = body[Symbol.asyncIterator]()
      fetchParams.controller.next = () => iterator.next()

      response = makeResponse({ status, statusText, headersList })
    }
  } catch (err) {
    // 10. If aborted, then:
    if (err.name === 'AbortError') {
      // 1. If connection uses HTTP/2, then transmit an RST_STREAM frame.
      fetchParams.controller.connection.destroy()

      // 2. Return the appropriate network error for fetchParams.
      return makeAppropriateNetworkError(fetchParams, err)
    }

    return makeNetworkError(err)
  }

  // 11. Let pullAlgorithm be an action that resumes the ongoing fetch
  // if it is suspended.
  const pullAlgorithm = () => {
    return fetchParams.controller.resume()
  }

  // 12. Let cancelAlgorithm be an algorithm that aborts fetchParams’s
  // controller with reason, given reason.
  const cancelAlgorithm = (reason) => {
    // If the aborted fetch was already terminated, then we do not
    // need to do anything.
    if (!isCancelled(fetchParams)) {
      fetchParams.controller.abort(reason)
    }
  }

  // 13. Let highWaterMark be a non-negative, non-NaN number, chosen by
  // the user agent.
  // TODO

  // 14. Let sizeAlgorithm be an algorithm that accepts a chunk object
  // and returns a non-negative, non-NaN, non-infinite number, chosen by the user agent.
  // TODO

  // 15. Let stream be a new ReadableStream.
  // 16. Set up stream with byte reading support with pullAlgorithm set to pullAlgorithm,
  //     cancelAlgorithm set to cancelAlgorithm.
  const stream = new ReadableStream(
    {
      start (controller) {
        fetchParams.controller.controller = controller
      },
      pull: pullAlgorithm,
      cancel: cancelAlgorithm,
      type: 'bytes'
    }
  )

  // 17. Run these steps, but abort when the ongoing fetch is terminated:

  //    1. Set response’s body to a new body whose stream is stream.
  response.body = { stream, source: null, length: null }

  //    2. If response is not a network error and request’s cache mode is
  //    not "no-store", then update response in httpCache for request.
  //    TODO

  //    3. If includeCredentials is true and the user agent is not configured
  //    to block cookies for request (see section 7 of [COOKIES]), then run the
  //    "set-cookie-string" parsing algorithm (see section 5.2 of [COOKIES]) on
  //    the value of each header whose name is a byte-case-insensitive match for
  //    `Set-Cookie` in response’s header list, if any, and request’s current URL.
  //    TODO

  // 18. If aborted, then:
  // TODO

  // 19. Run these steps in parallel:

  //    1. Run these steps, but abort when fetchParams is canceled:
  if (!fetchParams.controller.resume) {
    fetchParams.controller.on('terminated', onAborted)
  }

  fetchParams.controller.resume = async () => {
    // 1. While true
    while (true) {
      // 1-3. See onData...

      // 4. Set bytes to the result of handling content codings given
      // codings and bytes.
      let bytes
      let isFailure
      try {
        const { done, value } = await fetchParams.controller.next()

        if (isAborted(fetchParams)) {
          break
        }

        bytes = done ? undefined : value
      } catch (err) {
        if (fetchParams.controller.ended && !timingInfo.encodedBodySize) {
          // zlib doesn't like empty streams.
          bytes = undefined
        } else {
          bytes = err

          // err may be propagated from the result of calling readablestream.cancel,
          // which might not be an error. https://github.com/nodejs/undici/issues/2009
          isFailure = true
        }
      }

      if (bytes === undefined) {
        // 2. Otherwise, if the bytes transmission for response’s message
        // body is done normally and stream is readable, then close
        // stream, finalize response for fetchParams and response, and
        // abort these in-parallel steps.
        readableStreamClose(fetchParams.controller.controller)

        finalizeResponse(fetchParams, response)

        return
      }

      // 5. Increase timingInfo’s decoded body size by bytes’s length.
      timingInfo.decodedBodySize += bytes?.byteLength ?? 0

      // 6. If bytes is failure, then terminate fetchParams’s controller.
      if (isFailure) {
        fetchParams.controller.terminate(bytes)
        return
      }

      // 7. Enqueue a Uint8Array wrapping an ArrayBuffer containing bytes
      // into stream.
      const buffer = new Uint8Array(bytes)
      if (buffer.byteLength) {
        fetchParams.controller.controller.enqueue(buffer)
      }

      // 8. If stream is errored, then terminate the ongoing fetch.
      if (isErrored(stream)) {
        fetchParams.controller.terminate()
        return
      }

      // 9. If stream doesn’t need more data ask the user agent to suspend
      // the ongoing fetch.
      if (fetchParams.controller.controller.desiredSize <= 0) {
        return
      }
    }
  }

  //    2. If aborted, then:
  function onAborted (reason) {
    // 2. If fetchParams is aborted, then:
    if (isAborted(fetchParams)) {
      // 1. Set response’s aborted flag.
      response.aborted = true

      // 2. If stream is readable, then error stream with the result of
      //    deserialize a serialized abort reason given fetchParams’s
      //    controller’s serialized abort reason and an
      //    implementation-defined realm.
      if (isReadable(stream)) {
        fetchParams.controller.controller.error(
          fetchParams.controller.serializedAbortReason
        )
      }
    } else {
      // 3. Otherwise, if stream is readable, error stream with a TypeError.
      if (isReadable(stream)) {
        fetchParams.controller.controller.error(new TypeError('terminated', {
          cause: isErrorLike(reason) ? reason : undefined
        }))
      }
    }

    // 4. If connection uses HTTP/2, then transmit an RST_STREAM frame.
    // 5. Otherwise, the user agent should close connection unless it would be bad for performance to do so.
    fetchParams.controller.connection.destroy()
  }

  // 20. Return response.
  return response

  function dispatch ({ body }) {
    const url = requestCurrentURL(request)
    /** @type {import('../../..').Agent} */
    const agent = fetchParams.controller.dispatcher

    return new Promise((resolve, reject) => agent.dispatch(
      {
        path: url.pathname + url.search,
        origin: url.origin,
        method: request.method,
        body: agent.isMockActive ? request.body && (request.body.source || request.body.stream) : body,
        headers: request.headersList.entries,
        maxRedirections: 0,
        upgrade: request.mode === 'websocket' ? 'websocket' : undefined
      },
      {
        body: null,
        abort: null,

        onConnect (abort) {
          // TODO (fix): Do we need connection here?
          const { connection } = fetchParams.controller

          // Set timingInfo’s final connection timing info to the result of calling clamp and coarsen
          // connection timing info with connection’s timing info, timingInfo’s post-redirect start
          // time, and fetchParams’s cross-origin isolated capability.
          // TODO: implement connection timing
          timingInfo.finalConnectionTimingInfo = clampAndCoarsenConnectionTimingInfo(undefined, timingInfo.postRedirectStartTime, fetchParams.crossOriginIsolatedCapability)

          if (connection.destroyed) {
            abort(new DOMException('The operation was aborted.', 'AbortError'))
          } else {
            fetchParams.controller.on('terminated', abort)
            this.abort = connection.abort = abort
          }

          // Set timingInfo’s final network-request start time to the coarsened shared current time given
          // fetchParams’s cross-origin isolated capability.
          timingInfo.finalNetworkRequestStartTime = coarsenedSharedCurrentTime(fetchParams.crossOriginIsolatedCapability)
        },

        onResponseStarted () {
          // Set timingInfo’s final network-response start time to the coarsened shared current
          // time given fetchParams’s cross-origin isolated capability, immediately after the
          // user agent’s HTTP parser receives the first byte of the response (e.g., frame header
          // bytes for HTTP/2 or response status line for HTTP/1.x).
          timingInfo.finalNetworkResponseStartTime = coarsenedSharedCurrentTime(fetchParams.crossOriginIsolatedCapability)
        },

        onHeaders (status, rawHeaders, resume, statusText) {
          if (status < 200) {
            return false
          }

          const headersList = new HeadersList()

          for (let i = 0; i < rawHeaders.length; i += 2) {
            headersList.append(bufferToLowerCasedHeaderName(rawHeaders[i]), rawHeaders[i + 1].toString('latin1'), true)
          }
          const location = headersList.get('location', true)

          this.body = new Readable({ read: resume })

          const willFollow = location && request.redirect === 'follow' &&
            redirectStatusSet.has(status)

          const decoders = []

          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding
          if (request.method !== 'HEAD' && request.method !== 'CONNECT' && !nullBodyStatus.includes(status) && !willFollow) {
            // https://www.rfc-editor.org/rfc/rfc7231#section-3.1.2.1
            const contentEncoding = headersList.get('content-encoding', true)
            // "All content-coding values are case-insensitive..."
            /** @type {string[]} */
            const codings = contentEncoding ? contentEncoding.toLowerCase().split(',') : []

            // Limit the number of content-encodings to prevent resource exhaustion.
            // CVE fix similar to urllib3 (GHSA-gm62-xv2j-4w53) and curl (CVE-2022-32206).
            const maxContentEncodings = 5
            if (codings.length > maxContentEncodings) {
              reject(new Error(`too many content-encodings in response: ${codings.length}, maximum allowed is ${maxContentEncodings}`))
              return true
            }

            for (let i = codings.length - 1; i >= 0; --i) {
              const coding = codings[i].trim()
              // https://www.rfc-editor.org/rfc/rfc9112.html#section-7.2
              if (coding === 'x-gzip' || coding === 'gzip') {
                decoders.push(zlib.createGunzip({
                  // Be less strict when decoding compressed responses, since sometimes
                  // servers send slightly invalid responses that are still accepted
                  // by common browsers.
                  // Always using Z_SYNC_FLUSH is what cURL does.
                  flush: zlib.constants.Z_SYNC_FLUSH,
                  finishFlush: zlib.constants.Z_SYNC_FLUSH
                }))
              } else if (coding === 'deflate') {
                decoders.push(createInflate({
                  flush: zlib.constants.Z_SYNC_FLUSH,
                  finishFlush: zlib.constants.Z_SYNC_FLUSH
                }))
              } else if (coding === 'br') {
                decoders.push(zlib.createBrotliDecompress({
                  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
                  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH
                }))
              } else if (coding === 'zstd' && hasZstd) {
                decoders.push(zlib.createZstdDecompress({
                  flush: zlib.constants.ZSTD_e_continue,
                  finishFlush: zlib.constants.ZSTD_e_end
                }))
              } else {
                decoders.length = 0
                break
              }
            }
          }

          const onError = this.onError.bind(this)

          resolve({
            status,
            statusText,
            headersList,
            body: decoders.length
              ? pipeline(this.body, ...decoders, (err) => {
                if (err) {
                  this.onError(err)
                }
              }).on('error', onError)
              : this.body.on('error', onError)
          })

          return true
        },

        onData (chunk) {
          if (fetchParams.controller.dump) {
            return
          }

          // 1. If one or more bytes have been transmitted from response’s
          // message body, then:

          //  1. Let bytes be the transmitted bytes.
          const bytes = chunk

          //  2. Let codings be the result of extracting header list values
          //  given `Content-Encoding` and response’s header list.
          //  See pullAlgorithm.

          //  3. Increase timingInfo’s encoded body size by bytes’s length.
          timingInfo.encodedBodySize += bytes.byteLength

          //  4. See pullAlgorithm...

          return this.body.push(bytes)
        },

        onComplete () {
          if (this.abort) {
            fetchParams.controller.off('terminated', this.abort)
          }

          fetchParams.controller.ended = true

          this.body.push(null)
        },

        onError (error) {
          if (this.abort) {
            fetchParams.controller.off('terminated', this.abort)
          }

          this.body?.destroy(error)

          fetchParams.controller.terminate(error)

          reject(error)
        },

        onUpgrade (status, rawHeaders, socket) {
          // We need to support 200 for websocket over h2 as per RFC-8441
          // Absence of session means H1
          if ((socket.session != null && status !== 200) || (socket.session == null && status !== 101)) {
            return false
          }

          const headersList = new HeadersList()

          for (let i = 0; i < rawHeaders.length; i += 2) {
            headersList.append(bufferToLowerCasedHeaderName(rawHeaders[i]), rawHeaders[i + 1].toString('latin1'), true)
          }

          resolve({
            status,
            statusText: STATUS_CODES[status],
            headersList,
            socket
          })

          return true
        }
      }
    ))
  }
}

module.exports = {
  fetch,
  Fetch,
  fetching,
  finalizeAndReportTiming
}
