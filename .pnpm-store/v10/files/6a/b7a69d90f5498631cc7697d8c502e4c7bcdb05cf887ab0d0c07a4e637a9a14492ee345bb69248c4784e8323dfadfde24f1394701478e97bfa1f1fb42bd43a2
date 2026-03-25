// Ported from https://github.com/nodejs/undici/pull/907

'use strict'

const assert = require('assert')
const { Readable } = require('stream')
const { RequestAbortedError, NotSupportedError, InvalidArgumentError } = require('../core/errors')
const util = require('../core/util')
const { ReadableStreamFrom, toUSVString } = require('../core/util')

let Blob

const kConsume = Symbol('kConsume')
const kReading = Symbol('kReading')
const kBody = Symbol('kBody')
const kAbort = Symbol('abort')
const kContentType = Symbol('kContentType')

const noop = () => {}

module.exports = class BodyReadable extends Readable {
  constructor ({
    resume,
    abort,
    contentType = '',
    highWaterMark = 64 * 1024 // Same as nodejs fs streams.
  }) {
    super({
      autoDestroy: true,
      read: resume,
      highWaterMark
    })

    this._readableState.dataEmitted = false

    this[kAbort] = abort
    this[kConsume] = null
    this[kBody] = null
    this[kContentType] = contentType

    // Is stream being consumed through Readable API?
    // This is an optimization so that we avoid checking
    // for 'data' and 'readable' listeners in the hot path
    // inside push().
    this[kReading] = false
  }

  destroy (err) {
    if (this.destroyed) {
      // Node < 16
      return this
    }

    if (!err && !this._readableState.endEmitted) {
      err = new RequestAbortedError()
    }

    if (err) {
      this[kAbort]()
    }

    return super.destroy(err)
  }

  emit (ev, ...args) {
    if (ev === 'data') {
      // Node < 16.7
      this._readableState.dataEmitted = true
    } else if (ev === 'error') {
      // Node < 16
      this._readableState.errorEmitted = true
    }
    return super.emit(ev, ...args)
  }

  on (ev, ...args) {
    if (ev === 'data' || ev === 'readable') {
      this[kReading] = true
    }
    return super.on(ev, ...args)
  }

  addListener (ev, ...args) {
    return this.on(ev, ...args)
  }

  off (ev, ...args) {
    const ret = super.off(ev, ...args)
    if (ev === 'data' || ev === 'readable') {
      this[kReading] = (
        this.listenerCount('data') > 0 ||
        this.listenerCount('readable') > 0
      )
    }
    return ret
  }

  removeListener (ev, ...args) {
    return this.off(ev, ...args)
  }

  push (chunk) {
    if (this[kConsume] && chunk !== null && this.readableLength === 0) {
      consumePush(this[kConsume], chunk)
      return this[kReading] ? super.push(chunk) : true
    }
    return super.push(chunk)
  }

  // https://fetch.spec.whatwg.org/#dom-body-text
  async text () {
    return consume(this, 'text')
  }

  // https://fetch.spec.whatwg.org/#dom-body-json
  async json () {
    return consume(this, 'json')
  }

  // https://fetch.spec.whatwg.org/#dom-body-blob
  async blob () {
    return consume(this, 'blob')
  }

  // https://fetch.spec.whatwg.org/#dom-body-arraybuffer
  async arrayBuffer () {
    return consume(this, 'arrayBuffer')
  }

  // https://fetch.spec.whatwg.org/#dom-body-formdata
  async formData () {
    // TODO: Implement.
    throw new NotSupportedError()
  }

  // https://fetch.spec.whatwg.org/#dom-body-bodyused
  get bodyUsed () {
    return util.isDisturbed(this)
  }

  // https://fetch.spec.whatwg.org/#dom-body-body
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

  dump (opts) {
    let limit = opts && Number.isFinite(opts.limit) ? opts.limit : 262144
    const signal = opts && opts.signal

    if (signal) {
      try {
        if (typeof signal !== 'object' || !('aborted' in signal)) {
          throw new InvalidArgumentError('signal must be an AbortSignal')
        }
        util.throwIfAborted(signal)
      } catch (err) {
        return Promise.reject(err)
      }
    }

    if (this.closed) {
      return Promise.resolve(null)
    }

    return new Promise((resolve, reject) => {
      const signalListenerCleanup = signal
        ? util.addAbortListener(signal, () => {
          this.destroy()
        })
        : noop

      this
        .on('close', function () {
          signalListenerCleanup()
          if (signal && signal.aborted) {
            reject(signal.reason || Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))
          } else {
            resolve(null)
          }
        })
        .on('error', noop)
        .on('data', function (chunk) {
          limit -= chunk.length
          if (limit <= 0) {
            this.destroy()
          }
        })
        .resume()
    })
  }
}

// https://streams.spec.whatwg.org/#readablestream-locked
function isLocked (self) {
  // Consume is an implicit lock.
  return (self[kBody] && self[kBody].locked === true) || self[kConsume]
}

// https://fetch.spec.whatwg.org/#body-unusable
function isUnusable (self) {
  return util.isDisturbed(self) || isLocked(self)
}

async function consume (stream, type) {
  if (isUnusable(stream)) {
    throw new TypeError('unusable')
  }

  assert(!stream[kConsume])

  return new Promise((resolve, reject) => {
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

    process.nextTick(consumeStart, stream[kConsume])
  })
}

function consumeStart (consume) {
  if (consume.body === null) {
    return
  }

  const { _readableState: state } = consume.stream

  for (const chunk of state.buffer) {
    consumePush(consume, chunk)
  }

  if (state.endEmitted) {
    consumeEnd(this[kConsume])
  } else {
    consume.stream.on('end', function () {
      consumeEnd(this[kConsume])
    })
  }

  consume.stream.resume()

  while (consume.stream.read() != null) {
    // Loop
  }
}

function consumeEnd (consume) {
  const { type, body, resolve, stream, length } = consume

  try {
    if (type === 'text') {
      resolve(toUSVString(Buffer.concat(body)))
    } else if (type === 'json') {
      resolve(JSON.parse(Buffer.concat(body)))
    } else if (type === 'arrayBuffer') {
      const dst = new Uint8Array(length)

      let pos = 0
      for (const buf of body) {
        dst.set(buf, pos)
        pos += buf.byteLength
      }

      resolve(dst.buffer)
    } else if (type === 'blob') {
      if (!Blob) {
        Blob = require('buffer').Blob
      }
      resolve(new Blob(body, { type: stream[kContentType] }))
    }

    consumeFinish(consume)
  } catch (err) {
    stream.destroy(err)
  }
}

function consumePush (consume, chunk) {
  consume.length += chunk.length
  consume.body.push(chunk)
}

function consumeFinish (consume, err) {
  if (consume.body === null) {
    return
  }

  if (err) {
    consume.reject(err)
  } else {
    consume.resolve()
  }

  consume.type = null
  consume.stream = null
  consume.resolve = null
  consume.reject = null
  consume.length = 0
  consume.body = null
}
