'use strict'

const stream = require('stream')
const util = require('util')
const zlib = require('zlib')
const { playback_interceptor: debug } = require('./debug')
const common = require('./common')

function parseJSONRequestBody(req, requestBody) {
  if (!requestBody || !common.isJSONContent(req.headers)) {
    return requestBody
  }

  if (common.contentEncoding(req.headers, 'gzip')) {
    requestBody = String(zlib.gunzipSync(Buffer.from(requestBody, 'hex')))
  } else if (common.contentEncoding(req.headers, 'deflate')) {
    requestBody = String(zlib.inflateSync(Buffer.from(requestBody, 'hex')))
  }

  return JSON.parse(requestBody)
}

function parseFullReplyResult(response, fullReplyResult) {
  debug('full response from callback result: %j', fullReplyResult)

  if (!Array.isArray(fullReplyResult)) {
    throw Error('A single function provided to .reply MUST return an array')
  }

  if (fullReplyResult.length > 3) {
    throw Error(
      'The array returned from the .reply callback contains too many values',
    )
  }

  const [status, body = '', headers] = fullReplyResult

  if (!Number.isInteger(status)) {
    throw new Error(`Invalid ${typeof status} value for status code`)
  }

  response.statusCode = status
  response.rawHeaders.push(...common.headersInputToRawArray(headers))
  debug('response.rawHeaders after reply: %j', response.rawHeaders)

  return body
}

/**
 * Determine which of the default headers should be added to the response.
 *
 * Don't include any defaults whose case-insensitive keys are already on the response.
 */
function selectDefaultHeaders(existingHeaders, defaultHeaders) {
  if (!defaultHeaders.length) {
    return [] // return early if we don't need to bother
  }

  const definedHeaders = new Set()
  const result = []

  common.forEachHeader(existingHeaders, (_, fieldName) => {
    definedHeaders.add(fieldName.toLowerCase())
  })
  common.forEachHeader(defaultHeaders, (value, fieldName) => {
    if (!definedHeaders.has(fieldName.toLowerCase())) {
      result.push(fieldName, value)
    }
  })

  return result
}

// Presents a list of Buffers as a Readable
class ReadableBuffers extends stream.Readable {
  constructor(buffers, opts = {}) {
    super(opts)

    this.buffers = buffers
  }

  _read(_size) {
    while (this.buffers.length) {
      if (!this.push(this.buffers.shift())) {
        return
      }
    }
    this.push(null)
  }
}

function convertBodyToStream(body) {
  if (common.isStream(body)) {
    return body
  }

  if (body === undefined) {
    return new ReadableBuffers([])
  }

  if (Buffer.isBuffer(body)) {
    return new ReadableBuffers([body])
  }

  if (typeof body !== 'string') {
    body = JSON.stringify(body)
  }

  return new ReadableBuffers([Buffer.from(body)])
}

/**
 * Play back an interceptor using the given request and mock response.
 */
function playbackInterceptor({
  req,
  socket,
  options,
  requestBodyString,
  requestBodyIsUtf8Representable,
  response,
  interceptor,
}) {
  const { logger } = interceptor.scope

  function start() {
    req.headers = req.getHeaders()

    interceptor.scope.emit('request', req, interceptor, requestBodyString)

    if (typeof interceptor.errorMessage !== 'undefined') {
      let error
      if (typeof interceptor.errorMessage === 'object') {
        error = interceptor.errorMessage
      } else {
        error = new Error(interceptor.errorMessage)
      }

      const delay = interceptor.delayBodyInMs + interceptor.delayConnectionInMs
      common.setTimeout(() => req.destroy(error), delay)
      return
    }

    // This will be null if we have a fullReplyFunction,
    // in that case status code will be set in `parseFullReplyResult`
    response.statusCode = interceptor.statusCode

    // Clone headers/rawHeaders to not override them when evaluating later
    response.rawHeaders = [...interceptor.rawHeaders]
    logger('response.rawHeaders:', response.rawHeaders)

    // TODO: MAJOR: Don't tack the request onto the interceptor.
    // The only reason we do this is so that it's available inside reply functions.
    // It would be better to pass the request as an argument to the functions instead.
    // Not adding the req as a third arg now because it should first be decided if (path, body, req)
    // is the signature we want to go with going forward.
    interceptor.req = req

    if (interceptor.replyFunction) {
      const parsedRequestBody = parseJSONRequestBody(req, requestBodyString)

      let fn = interceptor.replyFunction
      if (fn.length === 3) {
        // Handle the case of an async reply function, the third parameter being the callback.
        fn = util.promisify(fn)
      }

      // At this point `fn` is either a synchronous function or a promise-returning function;
      // wrapping in `Promise.resolve` makes it into a promise either way.
      Promise.resolve(fn.call(interceptor, options.path, parsedRequestBody))
        .then(continueWithResponseBody)
        .catch(err => req.destroy(err))
      return
    }

    if (interceptor.fullReplyFunction) {
      const parsedRequestBody = parseJSONRequestBody(req, requestBodyString)

      let fn = interceptor.fullReplyFunction
      if (fn.length === 3) {
        fn = util.promisify(fn)
      }

      Promise.resolve(fn.call(interceptor, options.path, parsedRequestBody))
        .then(continueWithFullResponse)
        .catch(err => req.destroy(err))
      return
    }

    if (
      common.isContentEncoded(interceptor.headers) &&
      !common.isStream(interceptor.body)
    ) {
      //  If the content is encoded we know that the response body *must* be an array
      //  of response buffers which should be mocked one by one.
      //  (otherwise decompressions after the first one fails as unzip expects to receive
      //  buffer by buffer and not one single merged buffer)
      const bufferData = Array.isArray(interceptor.body)
        ? interceptor.body
        : [interceptor.body]
      const responseBuffers = bufferData.map(data => Buffer.from(data, 'hex'))
      const responseBody = new ReadableBuffers(responseBuffers)
      continueWithResponseBody(responseBody)
      return
    }

    // If we get to this point, the body is either a string or an object that
    // will eventually be JSON stringified.
    let responseBody = interceptor.body

    // If the request was not UTF8-representable then we assume that the
    // response won't be either. In that case we send the response as a Buffer
    // object as that's what the client will expect.
    if (!requestBodyIsUtf8Representable && typeof responseBody === 'string') {
      // Try to create the buffer from the interceptor's body response as hex.
      responseBody = Buffer.from(responseBody, 'hex')

      // Creating buffers does not necessarily throw errors; check for difference in size.
      if (
        !responseBody ||
        (interceptor.body.length > 0 && responseBody.length === 0)
      ) {
        // We fallback on constructing buffer from utf8 representation of the body.
        responseBody = Buffer.from(interceptor.body, 'utf8')
      }
    }

    return continueWithResponseBody(responseBody)
  }

  function continueWithFullResponse(fullReplyResult) {
    let responseBody
    try {
      responseBody = parseFullReplyResult(response, fullReplyResult)
    } catch (err) {
      req.destroy(err)
      return
    }

    continueWithResponseBody(responseBody)
  }

  function prepareResponseHeaders(body) {
    const defaultHeaders = [...interceptor.scope._defaultReplyHeaders]

    // Include a JSON content type when JSON.stringify is called on the body.
    // This is a convenience added by Nock that has no analog in Node. It's added to the
    // defaults, so it will be ignored if the caller explicitly provided the header already.
    const isJSON =
      body !== undefined &&
      typeof body !== 'string' &&
      !Buffer.isBuffer(body) &&
      !common.isStream(body)

    if (isJSON) {
      defaultHeaders.push('Content-Type', 'application/json')
    }

    response.rawHeaders.push(
      ...selectDefaultHeaders(response.rawHeaders, defaultHeaders),
    )

    // Evaluate functional headers.
    common.forEachHeader(response.rawHeaders, (value, fieldName, i) => {
      if (typeof value === 'function') {
        response.rawHeaders[i + 1] = value(req, response, body)
      }
    })

    response.headers = common.headersArrayToObject(response.rawHeaders)
  }

  function continueWithResponseBody(rawBody) {
    prepareResponseHeaders(rawBody)
    const bodyAsStream = convertBodyToStream(rawBody)
    bodyAsStream.pause()

    // IncomingMessage extends Readable so we can't simply pipe.
    bodyAsStream.on('data', function (chunk) {
      response.push(chunk)
    })
    bodyAsStream.on('end', function () {
      // https://nodejs.org/dist/latest-v10.x/docs/api/http.html#http_message_complete
      response.complete = true
      response.push(null)

      interceptor.scope.emit('replied', req, interceptor)
    })
    bodyAsStream.on('error', function (err) {
      response.emit('error', err)
    })

    const { delayBodyInMs, delayConnectionInMs } = interceptor

    function respond() {
      if (common.isRequestDestroyed(req)) {
        return
      }

      // Even though we've had the response object for awhile at this point,
      // we only attach it to the request immediately before the `response`
      // event because, as in Node, it alters the error handling around aborts.
      req.res = response
      response.req = req

      logger('emitting response')
      req.emit('response', response)

      common.setTimeout(() => bodyAsStream.resume(), delayBodyInMs)
    }

    socket.applyDelay(delayConnectionInMs)
    common.setTimeout(respond, delayConnectionInMs)
  }

  // Calling `start` immediately could take the request all the way to the connection delay
  // during a single microtask execution. This setImmediate stalls the playback to ensure the
  // correct events are emitted first ('socket', 'finish') and any aborts in the queue or
  // called during a 'finish' listener can be called.
  common.setImmediate(() => {
    if (!common.isRequestDestroyed(req)) {
      start()
    }
  })
}

module.exports = { playbackInterceptor }
