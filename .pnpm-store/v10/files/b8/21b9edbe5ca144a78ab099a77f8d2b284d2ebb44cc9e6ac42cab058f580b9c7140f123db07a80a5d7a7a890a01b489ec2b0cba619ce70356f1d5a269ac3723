'use strict'

const Busboy = require('@fastify/busboy')
const util = require('../core/util')
const {
  ReadableStreamFrom,
  isBlobLike,
  isReadableStreamLike,
  readableStreamClose,
  createDeferredPromise,
  fullyReadBody
} = require('./util')
const { FormData } = require('./formdata')
const { kState } = require('./symbols')
const { webidl } = require('./webidl')
const { DOMException, structuredClone } = require('./constants')
const { Blob, File: NativeFile } = require('buffer')
const { kBodyUsed } = require('../core/symbols')
const assert = require('assert')
const { isErrored } = require('../core/util')
const { isUint8Array, isArrayBuffer } = require('util/types')
const { File: UndiciFile } = require('./file')
const { parseMIMEType, serializeAMimeType } = require('./dataURL')

let random
try {
  const crypto = require('node:crypto')
  random = (max) => crypto.randomInt(0, max)
} catch {
  random = (max) => Math.floor(Math.random(max))
}

let ReadableStream = globalThis.ReadableStream

/** @type {globalThis['File']} */
const File = NativeFile ?? UndiciFile
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

// https://fetch.spec.whatwg.org/#concept-bodyinit-extract
function extractBody (object, keepalive = false) {
  if (!ReadableStream) {
    ReadableStream = require('stream/web').ReadableStream
  }

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
    //    up stream.
    stream = new ReadableStream({
      async pull (controller) {
        controller.enqueue(
          typeof source === 'string' ? textEncoder.encode(source) : source
        )
        queueMicrotask(() => readableStreamClose(controller))
      },
      start () {},
      type: undefined
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

    const chunk = textEncoder.encode(`--${boundary}--`)
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
    type = 'multipart/form-data; boundary=' + boundary
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
          })
        } else {
          // Whenever one or more bytes are available and stream is not errored,
          // enqueue a Uint8Array wrapping an ArrayBuffer containing the available
          // bytes into stream.
          if (!isErrored(stream)) {
            controller.enqueue(new Uint8Array(value))
          }
        }
        return controller.desiredSize > 0
      },
      async cancel (reason) {
        await iterator.return()
      },
      type: undefined
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
  if (!ReadableStream) {
    // istanbul ignore next
    ReadableStream = require('stream/web').ReadableStream
  }

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

function cloneBody (body) {
  // To clone a body body, run these steps:

  // https://fetch.spec.whatwg.org/#concept-body-clone

  // 1. Let « out1, out2 » be the result of teeing body’s stream.
  const [out1, out2] = body.stream.tee()
  const out2Clone = structuredClone(out2, { transfer: [out2] })
  // This, for whatever reasons, unrefs out2Clone which allows
  // the process to exit by itself.
  const [, finalClone] = out2Clone.tee()

  // 2. Set body’s stream to out1.
  body.stream = out1

  // 3. Return a body whose stream is out2 and other members are copied from body.
  return {
    stream: finalClone,
    length: body.length,
    source: body.source
  }
}

async function * consumeBody (body) {
  if (body) {
    if (isUint8Array(body)) {
      yield body
    } else {
      const stream = body.stream

      if (util.isDisturbed(stream)) {
        throw new TypeError('The body has already been consumed.')
      }

      if (stream.locked) {
        throw new TypeError('The stream is locked.')
      }

      // Compat.
      stream[kBodyUsed] = true

      yield * stream
    }
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
      return specConsumeBody(this, (bytes) => {
        let mimeType = bodyMimeType(this)

        if (mimeType === 'failure') {
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
      return specConsumeBody(this, (bytes) => {
        return new Uint8Array(bytes).buffer
      }, instance)
    },

    text () {
      // The text() method steps are to return the result of running
      // consume body with this and UTF-8 decode.
      return specConsumeBody(this, utf8DecodeBytes, instance)
    },

    json () {
      // The json() method steps are to return the result of running
      // consume body with this and parse JSON from bytes.
      return specConsumeBody(this, parseJSONFromBytes, instance)
    },

    async formData () {
      webidl.brandCheck(this, instance)

      throwIfAborted(this[kState])

      const contentType = this.headers.get('Content-Type')

      // If mimeType’s essence is "multipart/form-data", then:
      if (/multipart\/form-data/.test(contentType)) {
        const headers = {}
        for (const [key, value] of this.headers) headers[key.toLowerCase()] = value

        const responseFormData = new FormData()

        let busboy

        try {
          busboy = new Busboy({
            headers,
            preservePath: true
          })
        } catch (err) {
          throw new DOMException(`${err}`, 'AbortError')
        }

        busboy.on('field', (name, value) => {
          responseFormData.append(name, value)
        })
        busboy.on('file', (name, value, filename, encoding, mimeType) => {
          const chunks = []

          if (encoding === 'base64' || encoding.toLowerCase() === 'base64') {
            let base64chunk = ''

            value.on('data', (chunk) => {
              base64chunk += chunk.toString().replace(/[\r\n]/gm, '')

              const end = base64chunk.length - base64chunk.length % 4
              chunks.push(Buffer.from(base64chunk.slice(0, end), 'base64'))

              base64chunk = base64chunk.slice(end)
            })
            value.on('end', () => {
              chunks.push(Buffer.from(base64chunk, 'base64'))
              responseFormData.append(name, new File(chunks, filename, { type: mimeType }))
            })
          } else {
            value.on('data', (chunk) => {
              chunks.push(chunk)
            })
            value.on('end', () => {
              responseFormData.append(name, new File(chunks, filename, { type: mimeType }))
            })
          }
        })

        const busboyResolve = new Promise((resolve, reject) => {
          busboy.on('finish', resolve)
          busboy.on('error', (err) => reject(new TypeError(err)))
        })

        if (this.body !== null) for await (const chunk of consumeBody(this[kState].body)) busboy.write(chunk)
        busboy.end()
        await busboyResolve

        return responseFormData
      } else if (/application\/x-www-form-urlencoded/.test(contentType)) {
        // Otherwise, if mimeType’s essence is "application/x-www-form-urlencoded", then:

        // 1. Let entries be the result of parsing bytes.
        let entries
        try {
          let text = ''
          // application/x-www-form-urlencoded parser will keep the BOM.
          // https://url.spec.whatwg.org/#concept-urlencoded-parser
          // Note that streaming decoder is stateful and cannot be reused
          const streamingDecoder = new TextDecoder('utf-8', { ignoreBOM: true })

          for await (const chunk of consumeBody(this[kState].body)) {
            if (!isUint8Array(chunk)) {
              throw new TypeError('Expected Uint8Array chunk')
            }
            text += streamingDecoder.decode(chunk, { stream: true })
          }
          text += streamingDecoder.decode()
          entries = new URLSearchParams(text)
        } catch (err) {
          // istanbul ignore next: Unclear when new URLSearchParams can fail on a string.
          // 2. If entries is failure, then throw a TypeError.
          throw Object.assign(new TypeError(), { cause: err })
        }

        // 3. Return a new FormData object whose entries are entries.
        const formData = new FormData()
        for (const [name, value] of entries) {
          formData.append(name, value)
        }
        return formData
      } else {
        // Wait a tick before checking if the request has been aborted.
        // Otherwise, a TypeError can be thrown when an AbortError should.
        await Promise.resolve()

        throwIfAborted(this[kState])

        // Otherwise, throw a TypeError.
        throw webidl.errors.exception({
          header: `${instance.name}.formData`,
          message: 'Could not parse content as FormData.'
        })
      }
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
async function specConsumeBody (object, convertBytesToJSValue, instance) {
  webidl.brandCheck(object, instance)

  throwIfAborted(object[kState])

  // 1. If object is unusable, then return a promise rejected
  //    with a TypeError.
  if (bodyUnusable(object[kState].body)) {
    throw new TypeError('Body is unusable')
  }

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
    successSteps(new Uint8Array())
    return promise.promise
  }

  // 6. Otherwise, fully read object’s body given successSteps,
  //    errorSteps, and object’s relevant global object.
  await fullyReadBody(object[kState].body, successSteps, errorSteps)

  // 7. Return promise.
  return promise.promise
}

// https://fetch.spec.whatwg.org/#body-unusable
function bodyUnusable (body) {
  // An object including the Body interface mixin is
  // said to be unusable if its body is non-null and
  // its body’s stream is disturbed or locked.
  return body != null && (body.stream.locked || util.isDisturbed(body.stream))
}

/**
 * @see https://encoding.spec.whatwg.org/#utf-8-decode
 * @param {Buffer} buffer
 */
function utf8DecodeBytes (buffer) {
  if (buffer.length === 0) {
    return ''
  }

  // 1. Let buffer be the result of peeking three bytes from
  //    ioQueue, converted to a byte sequence.

  // 2. If buffer is 0xEF 0xBB 0xBF, then read three
  //    bytes from ioQueue. (Do nothing with those bytes.)
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    buffer = buffer.subarray(3)
  }

  // 3. Process a queue with an instance of UTF-8’s
  //    decoder, ioQueue, output, and "replacement".
  const output = textDecoder.decode(buffer)

  // 4. Return output.
  return output
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
 * @param {import('./response').Response|import('./request').Request} object
 */
function bodyMimeType (object) {
  const { headersList } = object[kState]
  const contentType = headersList.get('content-type')

  if (contentType === null) {
    return 'failure'
  }

  return parseMIMEType(contentType)
}

module.exports = {
  extractBody,
  safelyExtractBody,
  cloneBody,
  mixinBody
}
