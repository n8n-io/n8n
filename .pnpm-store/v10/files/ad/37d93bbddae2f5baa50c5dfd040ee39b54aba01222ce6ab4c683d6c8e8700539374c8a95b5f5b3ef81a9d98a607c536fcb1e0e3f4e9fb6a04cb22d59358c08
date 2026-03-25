'use strict'

const assert = require('node:assert')
const { Readable } = require('node:stream')
const { RequestAbortedError, NotSupportedError, InvalidArgumentError, AbortError } = require('../core/errors')
const util = require('../core/util')
const { ReadableStreamFrom } = require('../core/util')

const kConsume = Symbol('kConsume')
const kReading = Symbol('kReading')
const kBody = Symbol('kBody')
const kAbort = Symbol('kAbort')
const kContentType = Symbol('kContentType')
const kContentLength = Symbol('kContentLength')
const kUsed = Symbol('kUsed')
const kBytesRead = Symbol('kBytesRead')

const noop = () => {}

/**
 * @class
 * @extends {Readable}
 * @see https://fetch.spec.whatwg.org/#body
 */
class BodyReadable extends Readable {
  /**
   * @param {object} opts
   * @param {(this: Readable, size: number) => void} opts.resume
   * @param {() => (void | null)} opts.abort
   * @param {string} [opts.contentType = '']
   * @param {number} [opts.contentLength]
   * @param {number} [opts.highWaterMark = 64 * 1024]
   */
  constructor ({
    resume,
    abort,
    contentType = '',
    contentLength,
    highWaterMark = 64 * 1024 // Same as nodejs fs streams.
  }) {
    super({
      autoDestroy: true,
      read: resume,
      highWaterMark
    })

    this._readableState.dataEmitted = false

    this[kAbort] = abort

    /** @type {Consume | null} */
    this[kConsume] = null

    /** @type {number} */
    this[kBytesRead] = 0

    /** @type {ReadableStream|null} */
    this[kBody] = null

    /** @type {boolean} */
    this[kUsed] = false

    /** @type {string} */
    this[kContentType] = contentType

    /** @type {number|null} */
    this[kContentLength] = Number.isFinite(contentLength) ? contentLength : null

    /**
     * Is stream being consumed through Readable API?
     * This is an optimization so that we avoid checking
     * for 'data' and 'readable' listeners in the hot path
     * inside push().
     *
     * @type {boolean}
     */
    this[kReading] = false
  }

  /**
   * @param {Error|null} err
   * @param {(error:(Error|null)) => void} callback
   * @returns {void}
   */
  _destroy (err, callback) {
    if (!err && !this._readableState.endEmitted) {
      err = new RequestAbortedError()
    }

    if (err) {
      this[kAbort]()
    }

    // Workaround for Node "bug". If the stream is destroyed in same
    // tick as it is created, then a user who is waiting for a
    // promise (i.e micro tick) for installing an 'error' listener will
    // never get a chance and will always encounter an unhandled exception.
    if (!this[kUsed]) {
      setImmediate(callback, err)
    } else {
      callback(err)
    }
  }

  /**
   * @param {string|symbol} event
   * @param {(...args: any[]) => void} listener
   * @returns {this}
   */
  on (event, listener) {
    if (event === 'data' || event === 'readable') {
      this[kReading] = true
      this[kUsed] = true
    }
    return super.on(event, listener)
  }

  /**
   * @param {string|symbol} event
   * @param {(...args: any[]) => void} listener
   * @returns {this}
   */
  addListener (event, listener) {
    return this.on(event, listener)
  }

  /**
   * @param {string|symbol} event
   * @param {(...args: any[]) => void} listener
   * @returns {this}
   */
  off (event, listener) {
    const ret = super.off(event, listener)
    if (event === 'data' || event === 'readable') {
      this[kReading] = (
        this.listenerCount('data') > 0 ||
        this.listenerCount('readable') > 0
      )
    }
    return ret
  }

  /**
   * @param {string|symbol} event
   * @param {(...args: any[]) => void} listener
   * @returns {this}
   */
  removeListener (event, listener) {
    return this.off(event, listener)
  }

  /**
   * @param {Buffer|null} chunk
   * @returns {boolean}
   */
  push (chunk) {
    if (chunk) {
      this[kBytesRead] += chunk.length
      if (this[kConsume]) {
        consumePush(this[kConsume], chunk)
        return this[kReading] ? super.push(chunk) : true
      }
    }

    return super.push(chunk)
  }

  /**
   * Consumes and returns the body as a string.
   *
   * @see https://fetch.spec.whatwg.org/#dom-body-text
   * @returns {Promise<string>}
   */
  text () {
    return consume(this, 'text')
  }

  /**
   * Consumes and returns the body as a JavaScript Object.
   *
   * @see https://fetch.spec.whatwg.org/#dom-body-json
   * @returns {Promise<unknown>}
   */
  json () {
    return consume(this, 'json')
  }

  /**
   * Consumes and returns the body as a Blob
   *
   * @see https://fetch.spec.whatwg.org/#dom-body-blob
   * @returns {Promise<Blob>}
   */
  blob () {
    return consume(this, 'blob')
  }

  /**
   * Consumes and returns the body as an Uint8Array.
   *
   * @see https://fetch.spec.whatwg.org/#dom-body-bytes
   * @returns {Promise<Uint8Array>}
   */
  bytes () {
    return consume(this, 'bytes')
  }

  /**
   * Consumes and returns the body as an ArrayBuffer.
   *
   * @see https://fetch.spec.whatwg.org/#dom-body-arraybuffer
   * @returns {Promise<ArrayBuffer>}
   */
  arrayBuffer () {
    return consume(this, 'arrayBuffer')
  }

  /**
   * Not implemented
   *
   * @see https://fetch.spec.whatwg.org/#dom-body-formdata
   * @throws {NotSupportedError}
   */
  async formData () {
    // TODO: Implement.
    throw new NotSupportedError()
  }

  /**
   * Returns true if the body is not null and the body has been consumed.
   * Otherwise, returns false.
   *
   * @see https://fetch.spec.whatwg.org/#dom-body-bodyused
   * @readonly
   * @returns {boolean}
   */
  get bodyUsed () {
    return util.isDisturbed(this)
  }

  /**
   * @see https://fetch.spec.whatwg.org/#dom-body-body
   * @readonly
   * @returns {ReadableStream}
   */
  get body () {
    if (!this[kBody]) {
      this[kBody] = ReadableStreamFrom(this)
      if (this[kConsume]) {
        // TODO: Is this the best way to force a lock?
        this[kBody].getReader() // Ensure stream is locked.
        assert(this[kBody].locked)
      }
    }
    return this[kBody]
  }

  /**
   * Dumps the response body by reading `limit` number of bytes.
   * @param {object} opts
   * @param {number} [opts.limit = 131072] Number of bytes to read.
   * @param {AbortSignal} [opts.signal] An AbortSignal to cancel the dump.
   * @returns {Promise<null>}
   */
  dump (opts) {
    const signal = opts?.signal

    if (signal != null && (typeof signal !== 'object' || !('aborted' in signal))) {
      return Promise.reject(new InvalidArgumentError('signal must be an AbortSignal'))
    }

    const limit = opts?.limit && Number.isFinite(opts.limit)
      ? opts.limit
      : 128 * 1024

    if (signal?.aborted) {
      return Promise.reject(signal.reason ?? new AbortError())
    }

    if (this._readableState.closeEmitted) {
      return Promise.resolve(null)
    }

    return new Promise((resolve, reject) => {
      if (
        (this[kContentLength] && (this[kContentLength] > limit)) ||
        this[kBytesRead] > limit
      ) {
        this.destroy(new AbortError())
      }

      if (signal) {
        const onAbort = () => {
          this.destroy(signal.reason ?? new AbortError())
        }
        signal.addEventListener('abort', onAbort)
        this
          .on('close', function () {
            signal.removeEventListener('abort', onAbort)
            if (signal.aborted) {
              reject(signal.reason ?? new AbortError())
            } else {
              resolve(null)
            }
          })
      } else {
        this.on('close', resolve)
      }

      this
        .on('error', noop)
        .on('data', () => {
          if (this[kBytesRead] > limit) {
            this.destroy()
          }
        })
        .resume()
    })
  }

  /**
   * @param {BufferEncoding} encoding
   * @returns {this}
   */
  setEncoding (encoding) {
    if (Buffer.isEncoding(encoding)) {
      this._readableState.encoding = encoding
    }
    return this
  }
}

/**
 * @see https://streams.spec.whatwg.org/#readablestream-locked
 * @param {BodyReadable} bodyReadable
 * @returns {boolean}
 */
function isLocked (bodyReadable) {
  // Consume is an implicit lock.
  return bodyReadable[kBody]?.locked === true || bodyReadable[kConsume] !== null
}

/**
 * @see https://fetch.spec.whatwg.org/#body-unusable
 * @param {BodyReadable} bodyReadable
 * @returns {boolean}
 */
function isUnusable (bodyReadable) {
  return util.isDisturbed(bodyReadable) || isLocked(bodyReadable)
}

/**
 * @typedef {'text' | 'json' | 'blob' | 'bytes' | 'arrayBuffer'} ConsumeType
 */

/**
 * @template {ConsumeType} T
 * @typedef {T extends 'text' ? string :
 *           T extends 'json' ? unknown :
 *           T extends 'blob' ? Blob :
 *           T extends 'arrayBuffer' ? ArrayBuffer :
 *           T extends 'bytes' ? Uint8Array :
 *           never
 * } ConsumeReturnType
 */
/**
 * @typedef {object} Consume
 * @property {ConsumeType} type
 * @property {BodyReadable} stream
 * @property {((value?: any) => void)} resolve
 * @property {((err: Error) => void)} reject
 * @property {number} length
 * @property {Buffer[]} body
 */

/**
 * @template {ConsumeType} T
 * @param {BodyReadable} stream
 * @param {T} type
 * @returns {Promise<ConsumeReturnType<T>>}
 */
function consume (stream, type) {
  assert(!stream[kConsume])

  return new Promise((resolve, reject) => {
    if (isUnusable(stream)) {
      const rState = stream._readableState
      if (rState.destroyed && rState.closeEmitted === false) {
        stream
          .on('error', reject)
          .on('close', () => {
            reject(new TypeError('unusable'))
          })
      } else {
        reject(rState.errored ?? new TypeError('unusable'))
      }
    } else {
      queueMicrotask(() => {
        stream[kConsume] = {
          type,
          stream,
          resolve,
          reject,
          length: 0,
          body: []
        }

        stream
          .on('error', function (err) {
            consumeFinish(this[kConsume], err)
          })
          .on('close', function () {
            if (this[kConsume].body !== null) {
              consumeFinish(this[kConsume], new RequestAbortedError())
            }
          })

        consumeStart(stream[kConsume])
      })
    }
  })
}

/**
 * @param {Consume} consume
 * @returns {void}
 */
function consumeStart (consume) {
  if (consume.body === null) {
    return
  }

  const { _readableState: state } = consume.stream

  if (state.bufferIndex) {
    const start = state.bufferIndex
    const end = state.buffer.length
    for (let n = start; n < end; n++) {
      consumePush(consume, state.buffer[n])
    }
  } else {
    for (const chunk of state.buffer) {
      consumePush(consume, chunk)
    }
  }

  if (state.endEmitted) {
    consumeEnd(this[kConsume], this._readableState.encoding)
  } else {
    consume.stream.on('end', function () {
      consumeEnd(this[kConsume], this._readableState.encoding)
    })
  }

  consume.stream.resume()

  while (consume.stream.read() != null) {
    // Loop
  }
}

/**
 * @param {Buffer[]} chunks
 * @param {number} length
 * @param {BufferEncoding} [encoding='utf8']
 * @returns {string}
 */
function chunksDecode (chunks, length, encoding) {
  if (chunks.length === 0 || length === 0) {
    return ''
  }
  const buffer = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, length)
  const bufferLength = buffer.length

  // Skip BOM.
  const start =
    bufferLength > 2 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
      ? 3
      : 0
  if (!encoding || encoding === 'utf8' || encoding === 'utf-8') {
    return buffer.utf8Slice(start, bufferLength)
  } else {
    return buffer.subarray(start, bufferLength).toString(encoding)
  }
}

/**
 * @param {Buffer[]} chunks
 * @param {number} length
 * @returns {Uint8Array}
 */
function chunksConcat (chunks, length) {
  if (chunks.length === 0 || length === 0) {
    return new Uint8Array(0)
  }
  if (chunks.length === 1) {
    // fast-path
    return new Uint8Array(chunks[0])
  }
  const buffer = new Uint8Array(Buffer.allocUnsafeSlow(length).buffer)

  let offset = 0
  for (let i = 0; i < chunks.length; ++i) {
    const chunk = chunks[i]
    buffer.set(chunk, offset)
    offset += chunk.length
  }

  return buffer
}

/**
 * @param {Consume} consume
 * @param {BufferEncoding} encoding
 * @returns {void}
 */
function consumeEnd (consume, encoding) {
  const { type, body, resolve, stream, length } = consume

  try {
    if (type === 'text') {
      resolve(chunksDecode(body, length, encoding))
    } else if (type === 'json') {
      resolve(JSON.parse(chunksDecode(body, length, encoding)))
    } else if (type === 'arrayBuffer') {
      resolve(chunksConcat(body, length).buffer)
    } else if (type === 'blob') {
      resolve(new Blob(body, { type: stream[kContentType] }))
    } else if (type === 'bytes') {
      resolve(chunksConcat(body, length))
    }

    consumeFinish(consume)
  } catch (err) {
    stream.destroy(err)
  }
}

/**
 * @param {Consume} consume
 * @param {Buffer} chunk
 * @returns {void}
 */
function consumePush (consume, chunk) {
  consume.length += chunk.length
  consume.body.push(chunk)
}

/**
 * @param {Consume} consume
 * @param {Error} [err]
 * @returns {void}
 */
function consumeFinish (consume, err) {
  if (consume.body === null) {
    return
  }

  if (err) {
    consume.reject(err)
  } else {
    consume.resolve()
  }

  // Reset the consume object to allow for garbage collection.
  consume.type = null
  consume.stream = null
  consume.resolve = null
  consume.reject = null
  consume.length = 0
  consume.body = null
}

module.exports = {
  Readable: BodyReadable,
  chunksDecode
}
