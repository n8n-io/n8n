'use strict'

const util = require('../../core/util')
const {
  ReadableStreamFrom,
  isBlobLike,
  isReadableStreamLike,
  readableStreamClose,
  createDeferredPromise,
  fullyReadBody,
  extractMimeType,
  utf8DecodeBytes
} = require('./util')
const { FormData } = require('./formdata')
const { kState } = require('./symbols')
const { webidl } = require('./webidl')
const { Blob } = require('node:buffer')
const assert = require('node:assert')
const { isErrored, isDisturbed } = require('node:stream')
const { isArrayBuffer } = require('node:util/types')
const { serializeAMimeType } = require('./data-url')
const { multipartFormDataParser } = require('./formdata-parser')
let random

try {
  const crypto = require('node:crypto')
  random = (max) => crypto.randomInt(0, max)
} catch {
  random = (max) => Math.floor(Math.random(max))
}

const textEncoder = new TextEncoder()
function noop () {}

const hasFinalizationRegistry = globalThis.FinalizationRegistry && process.version.indexOf('v18') !== 0
let streamRegistry

if (hasFinalizationRegistry) {
  streamRegistry = new FinalizationRegistry((weakRef) => {
    const stream = weakRef.deref()
    if (stream && !stream.locked && !isDisturbed(stream) && !isErrored(stream)) {
      stream.cancel('Response object has been garbage collected').catch(noop)
    }
  })
}

// https://fetch.spec.whatwg.org/#concept-bodyinit-extract
function extractBody (object, keepalive = false) {
  // 1. Let stream be null.
  let stream = null

  // 2. If object is a ReadableStream object, then set stream to object.
  if (object instanceof ReadableStream) {
    stream = object
  } else if (isBlobLike(object)) {
    // 3. Otherwise, if object is a Blob object, set stream to the
    //    result of running object’s get stream.
    stream = object.stream()
  } else {
    // 4. Otherwise, set stream to a new ReadableStream object, and set
    //    up stream with byte reading support.
    stream = new ReadableStream({
      async pull (controller) {
        const buffer = typeof source === 'string' ? textEncoder.encode(source) : source

        if (buffer.byteLength) {
          controller.enqueue(buffer)
        }

        queueMicrotask(() => readableStreamClose(controller))
      },
      start () {},
      type: 'bytes'
    })
  }

  // 5. Assert: stream is a ReadableStream object.
  assert(isReadableStreamLike(stream))

  // 6. Let action be null.
  let action = null

  // 7. Let source be null.
  let source = null

  // 8. Let length be null.
  let length = null

  // 9. Let type be null.
  let type = null

  // 10. Switch on object:
  if (typeof object === 'string') {
    // Set source to the UTF-8 encoding of object.
    // Note: setting source to a Uint8Array here breaks some mocking assumptions.
    source = object

    // Set type to `text/plain;charset=UTF-8`.
    type = 'text/plain;charset=UTF-8'
  } else if (object instanceof URLSearchParams) {
    // URLSearchParams

    // spec says to run application/x-www-form-urlencoded on body.list
    // this is implemented in Node.js as apart of an URLSearchParams instance toString method
    // See: https://github.com/nodejs/node/blob/e46c680bf2b211bbd52cf959ca17ee98c7f657f5/lib/internal/url.js#L490
    // and https://github.com/nodejs/node/blob/e46c680bf2b211bbd52cf959ca17ee98c7f657f5/lib/internal/url.js#L1100

    // Set source to the result of running the application/x-www-form-urlencoded serializer with object’s list.
    source = object.toString()

    // Set type to `application/x-www-form-urlencoded;charset=UTF-8`.
    type = 'application/x-www-form-urlencoded;charset=UTF-8'
  } else if (isArrayBuffer(object)) {
    // BufferSource/ArrayBuffer

    // Set source to a copy of the bytes held by object.
    source = new Uint8Array(object.slice())
  } else if (ArrayBuffer.isView(object)) {
    // BufferSource/ArrayBufferView

    // Set source to a copy of the bytes held by object.
    source = new Uint8Array(object.buffer.slice(object.byteOffset, object.byteOffset + object.byteLength))
  } else if (util.isFormDataLike(object)) {
    const boundary = `----formdata-undici-0${`${random(1e11)}`.padStart(11, '0')}`
    const prefix = `--${boundary}\r\nContent-Disposition: form-data`

    /*! formdata-polyfill. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
    const escape = (str) =>
      str.replace(/\n/g, '%0A').replace(/\r/g, '%0D').replace(/"/g, '%22')
    const normalizeLinefeeds = (value) => value.replace(/\r?\n|\r/g, '\r\n')

    // Set action to this step: run the multipart/form-data
    // encoding algorithm, with object’s entry list and UTF-8.
    // - This ensures that the body is immutable and can't be changed afterwords
    // - That the content-length is calculated in advance.
    // - And that all parts are pre-encoded and ready to be sent.

    const blobParts = []
    const rn = new Uint8Array([13, 10]) // '\r\n'
    length = 0
    let hasUnknownSizeValue = false

    for (const [name, value] of object) {
      if (typeof value === 'string') {
        const chunk = textEncoder.encode(prefix +
          `; name="${escape(normalizeLinefeeds(name))}"` +
          `\r\n\r\n${normalizeLinefeeds(value)}\r\n`)
        blobParts.push(chunk)
        length += chunk.byteLength
      } else {
        const chunk = textEncoder.encode(`${prefix}; name="${escape(normalizeLinefeeds(name))}"` +
          (value.name ? `; filename="${escape(value.name)}"` : '') + '\r\n' +
          `Content-Type: ${
            value.type || 'application/octet-stream'
          }\r\n\r\n`)
        blobParts.push(chunk, value, rn)
        if (typeof value.size === 'number') {
          length += chunk.byteLength + value.size + rn.byteLength
        } else {
          hasUnknownSizeValue = true
        }
      }
    }

    // CRLF is appended to the body to function with legacy servers and match other implementations.
    // https://github.com/curl/curl/blob/3434c6b46e682452973972e8313613dfa58cd690/lib/mime.c#L1029-L1030
    // https://github.com/form-data/form-data/issues/63
    const chunk = textEncoder.encode(`--${boundary}--\r\n`)
    blobParts.push(chunk)
    length += chunk.byteLength
    if (hasUnknownSizeValue) {
      length = null
    }

    // Set source to object.
    source = object

    action = async function * () {
      for (const part of blobParts) {
        if (part.stream) {
          yield * part.stream()
        } else {
          yield part
        }
      }
    }

    // Set type to `multipart/form-data; boundary=`,
    // followed by the multipart/form-data boundary string generated
    // by the multipart/form-data encoding algorithm.
    type = `multipart/form-data; boundary=${boundary}`
  } else if (isBlobLike(object)) {
    // Blob

    // Set source to object.
    source = object

    // Set length to object’s size.
    length = object.size

    // If object’s type attribute is not the empty byte sequence, set
    // type to its value.
    if (object.type) {
      type = object.type
    }
  } else if (typeof object[Symbol.asyncIterator] === 'function') {
    // If keepalive is true, then throw a TypeError.
    if (keepalive) {
      throw new TypeError('keepalive')
    }

    // If object is disturbed or locked, then throw a TypeError.
    if (util.isDisturbed(object) || object.locked) {
      throw new TypeError(
        'Response body object should not be disturbed or locked'
      )
    }

    stream =
      object instanceof ReadableStream ? object : ReadableStreamFrom(object)
  }

  // 11. If source is a byte sequence, then set action to a
  // step that returns source and length to source’s length.
  if (typeof source === 'string' || util.isBuffer(source)) {
    length = Buffer.byteLength(source)
  }

  // 12. If action is non-null, then run these steps in in parallel:
  if (action != null) {
    // Run action.
    let iterator
    stream = new ReadableStream({
      async start () {
        iterator = action(object)[Symbol.asyncIterator]()
      },
      async pull (controller) {
        const { value, done } = await iterator.next()
        if (done) {
          // When running action is done, close stream.
          queueMicrotask(() => {
            controller.close()
            controller.byobRequest?.respond(0)
          })
        } else {
          // Whenever one or more bytes are available and stream is not errored,
          // enqueue a Uint8Array wrapping an ArrayBuffer containing the available
          // bytes into stream.
          if (!isErrored(stream)) {
            const buffer = new Uint8Array(value)
            if (buffer.byteLength) {
              controller.enqueue(buffer)
            }
          }
        }
        return controller.desiredSize > 0
      },
      async cancel (reason) {
        await iterator.return()
      },
      type: 'bytes'
    })
  }

  // 13. Let body be a body whose stream is stream, source is source,
  // and length is length.
  const body = { stream, source, length }

  // 14. Return (body, type).
  return [body, type]
}

// https://fetch.spec.whatwg.org/#bodyinit-safely-extract
function safelyExtractBody (object, keepalive = false) {
  // To safely extract a body and a `Content-Type` value from
  // a byte sequence or BodyInit object object, run these steps:

  // 1. If object is a ReadableStream object, then:
  if (object instanceof ReadableStream) {
    // Assert: object is neither disturbed nor locked.
    // istanbul ignore next
    assert(!util.isDisturbed(object), 'The body has already been consumed.')
    // istanbul ignore next
    assert(!object.locked, 'The stream is locked.')
  }

  // 2. Return the results of extracting object.
  return extractBody(object, keepalive)
}

function cloneBody (instance, body) {
  // To clone a body body, run these steps:

  // https://fetch.spec.whatwg.org/#concept-body-clone

  // 1. Let « out1, out2 » be the result of teeing body’s stream.
  const [out1, out2] = body.stream.tee()

  // 2. Set body’s stream to out1.
  body.stream = out1

  // 3. Return a body whose stream is out2 and other members are copied from body.
  return {
    stream: out2,
    length: body.length,
    source: body.source
  }
}

function throwIfAborted (state) {
  if (state.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }
}

function bodyMixinMethods (instance) {
  const methods = {
    blob () {
      // The blob() method steps are to return the result of
      // running consume body with this and the following step
      // given a byte sequence bytes: return a Blob whose
      // contents are bytes and whose type attribute is this’s
      // MIME type.
      return consumeBody(this, (bytes) => {
        let mimeType = bodyMimeType(this)

        if (mimeType === null) {
          mimeType = ''
        } else if (mimeType) {
          mimeType = serializeAMimeType(mimeType)
        }

        // Return a Blob whose contents are bytes and type attribute
        // is mimeType.
        return new Blob([bytes], { type: mimeType })
      }, instance)
    },

    arrayBuffer () {
      // The arrayBuffer() method steps are to return the result
      // of running consume body with this and the following step
      // given a byte sequence bytes: return a new ArrayBuffer
      // whose contents are bytes.
      return consumeBody(this, (bytes) => {
        return new Uint8Array(bytes).buffer
      }, instance)
    },

    text () {
      // The text() method steps are to return the result of running
      // consume body with this and UTF-8 decode.
      return consumeBody(this, utf8DecodeBytes, instance)
    },

    json () {
      // The json() method steps are to return the result of running
      // consume body with this and parse JSON from bytes.
      return consumeBody(this, parseJSONFromBytes, instance)
    },

    formData () {
      // The formData() method steps are to return the result of running
      // consume body with this and the following step given a byte sequence bytes:
      return consumeBody(this, (value) => {
        // 1. Let mimeType be the result of get the MIME type with this.
        const mimeType = bodyMimeType(this)

        // 2. If mimeType is non-null, then switch on mimeType’s essence and run
        //    the corresponding steps:
        if (mimeType !== null) {
          switch (mimeType.essence) {
            case 'multipart/form-data': {
              // 1. ... [long step]
              const parsed = multipartFormDataParser(value, mimeType)

              // 2. If that fails for some reason, then throw a TypeError.
              if (parsed === 'failure') {
                throw new TypeError('Failed to parse body as FormData.')
              }

              // 3. Return a new FormData object, appending each entry,
              //    resulting from the parsing operation, to its entry list.
              const fd = new FormData()
              fd[kState] = parsed

              return fd
            }
            case 'application/x-www-form-urlencoded': {
              // 1. Let entries be the result of parsing bytes.
              const entries = new URLSearchParams(value.toString())

              // 2. If entries is failure, then throw a TypeError.

              // 3. Return a new FormData object whose entry list is entries.
              const fd = new FormData()

              for (const [name, value] of entries) {
                fd.append(name, value)
              }

              return fd
            }
          }
        }

        // 3. Throw a TypeError.
        throw new TypeError(
          'Content-Type was not one of "multipart/form-data" or "application/x-www-form-urlencoded".'
        )
      }, instance)
    },

    bytes () {
      // The bytes() method steps are to return the result of running consume body
      // with this and the following step given a byte sequence bytes: return the
      // result of creating a Uint8Array from bytes in this’s relevant realm.
      return consumeBody(this, (bytes) => {
        return new Uint8Array(bytes)
      }, instance)
    }
  }

  return methods
}

function mixinBody (prototype) {
  Object.assign(prototype.prototype, bodyMixinMethods(prototype))
}

/**
 * @see https://fetch.spec.whatwg.org/#concept-body-consume-body
 * @param {Response|Request} object
 * @param {(value: unknown) => unknown} convertBytesToJSValue
 * @param {Response|Request} instance
 */
async function consumeBody (object, convertBytesToJSValue, instance) {
  webidl.brandCheck(object, instance)

  // 1. If object is unusable, then return a promise rejected
  //    with a TypeError.
  if (bodyUnusable(object)) {
    throw new TypeError('Body is unusable: Body has already been read')
  }

  throwIfAborted(object[kState])

  // 2. Let promise be a new promise.
  const promise = createDeferredPromise()

  // 3. Let errorSteps given error be to reject promise with error.
  const errorSteps = (error) => promise.reject(error)

  // 4. Let successSteps given a byte sequence data be to resolve
  //    promise with the result of running convertBytesToJSValue
  //    with data. If that threw an exception, then run errorSteps
  //    with that exception.
  const successSteps = (data) => {
    try {
      promise.resolve(convertBytesToJSValue(data))
    } catch (e) {
      errorSteps(e)
    }
  }

  // 5. If object’s body is null, then run successSteps with an
  //    empty byte sequence.
  if (object[kState].body == null) {
    successSteps(Buffer.allocUnsafe(0))
    return promise.promise
  }

  // 6. Otherwise, fully read object’s body given successSteps,
  //    errorSteps, and object’s relevant global object.
  await fullyReadBody(object[kState].body, successSteps, errorSteps)

  // 7. Return promise.
  return promise.promise
}

// https://fetch.spec.whatwg.org/#body-unusable
function bodyUnusable (object) {
  const body = object[kState].body

  // An object including the Body interface mixin is
  // said to be unusable if its body is non-null and
  // its body’s stream is disturbed or locked.
  return body != null && (body.stream.locked || util.isDisturbed(body.stream))
}

/**
 * @see https://infra.spec.whatwg.org/#parse-json-bytes-to-a-javascript-value
 * @param {Uint8Array} bytes
 */
function parseJSONFromBytes (bytes) {
  return JSON.parse(utf8DecodeBytes(bytes))
}

/**
 * @see https://fetch.spec.whatwg.org/#concept-body-mime-type
 * @param {import('./response').Response|import('./request').Request} requestOrResponse
 */
function bodyMimeType (requestOrResponse) {
  // 1. Let headers be null.
  // 2. If requestOrResponse is a Request object, then set headers to requestOrResponse’s request’s header list.
  // 3. Otherwise, set headers to requestOrResponse’s response’s header list.
  /** @type {import('./headers').HeadersList} */
  const headers = requestOrResponse[kState].headersList

  // 4. Let mimeType be the result of extracting a MIME type from headers.
  const mimeType = extractMimeType(headers)

  // 5. If mimeType is failure, then return null.
  if (mimeType === 'failure') {
    return null
  }

  // 6. Return mimeType.
  return mimeType
}

module.exports = {
  extractBody,
  safelyExtractBody,
  cloneBody,
  mixinBody,
  streamRegistry,
  hasFinalizationRegistry,
  bodyUnusable
}
