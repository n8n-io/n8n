'use strict'

const assert = require('assert')
const util = require('util')

// RedisError

function RedisError (message) {
  Object.defineProperty(this, 'message', {
    value: message || '',
    configurable: true,
    writable: true
  })
  Error.captureStackTrace(this, this.constructor)
}

util.inherits(RedisError, Error)

Object.defineProperty(RedisError.prototype, 'name', {
  value: 'RedisError',
  configurable: true,
  writable: true
})

// ParserError

function ParserError (message, buffer, offset) {
  assert(buffer)
  assert.strictEqual(typeof offset, 'number')

  Object.defineProperty(this, 'message', {
    value: message || '',
    configurable: true,
    writable: true
  })

  const tmp = Error.stackTraceLimit
  Error.stackTraceLimit = 2
  Error.captureStackTrace(this, this.constructor)
  Error.stackTraceLimit = tmp
  this.offset = offset
  this.buffer = buffer
}

util.inherits(ParserError, RedisError)

Object.defineProperty(ParserError.prototype, 'name', {
  value: 'ParserError',
  configurable: true,
  writable: true
})

// ReplyError

function ReplyError (message) {
  Object.defineProperty(this, 'message', {
    value: message || '',
    configurable: true,
    writable: true
  })
  const tmp = Error.stackTraceLimit
  Error.stackTraceLimit = 2
  Error.captureStackTrace(this, this.constructor)
  Error.stackTraceLimit = tmp
}

util.inherits(ReplyError, RedisError)

Object.defineProperty(ReplyError.prototype, 'name', {
  value: 'ReplyError',
  configurable: true,
  writable: true
})

// AbortError

function AbortError (message) {
  Object.defineProperty(this, 'message', {
    value: message || '',
    configurable: true,
    writable: true
  })
  Error.captureStackTrace(this, this.constructor)
}

util.inherits(AbortError, RedisError)

Object.defineProperty(AbortError.prototype, 'name', {
  value: 'AbortError',
  configurable: true,
  writable: true
})

// InterruptError

function InterruptError (message) {
  Object.defineProperty(this, 'message', {
    value: message || '',
    configurable: true,
    writable: true
  })
  Error.captureStackTrace(this, this.constructor)
}

util.inherits(InterruptError, AbortError)

Object.defineProperty(InterruptError.prototype, 'name', {
  value: 'InterruptError',
  configurable: true,
  writable: true
})

module.exports = {
  RedisError,
  ParserError,
  ReplyError,
  AbortError,
  InterruptError
}
