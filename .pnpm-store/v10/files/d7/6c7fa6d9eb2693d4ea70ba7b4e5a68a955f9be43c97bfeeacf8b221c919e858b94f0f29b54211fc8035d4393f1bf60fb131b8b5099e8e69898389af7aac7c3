'use strict'

const hyperid = require('hyperid')
const inherits = require('util').inherits
const requestBuilder = require('./httpRequestBuilder')
const clone = require('lodash.clonedeep')
const chunk = require('lodash.chunk')
const flatten = require('lodash.flatten')

const toHeaderKeyValue = (rawHeaders) => {
  const tupleHeaders = chunk(rawHeaders, 2)
  const headers = {}
  tupleHeaders.forEach((val) => {
    const currentValue = headers[val[0]]
    if (!currentValue) {
      headers[val[0]] = val[1]
    } else {
      headers[val[0]] = flatten([currentValue, val[1]])
    }
  })
  return headers
}

function RequestIterator (opts) {
  if (!(this instanceof RequestIterator)) {
    return new RequestIterator(opts)
  }

  this.hyperid = hyperid({ urlSafe: true })
  this.resetted = false
  this.headers = {}
  this.initialContext = opts.initialContext || {}
  this.resetContext()
  this.reqDefaults = opts
  this.requestBuilder = requestBuilder(opts)
  this.setRequests(opts.requests)
}

inherits(RequestIterator, Object)

RequestIterator.prototype.resetContext = function () {
  this.context = clone(this.initialContext)
}

RequestIterator.prototype.nextRequest = function () {
  this.resetted = false
  ++this.currentRequestIndex
  // when looping over available request, clear context for a fresh start
  if (this.currentRequestIndex === this.requests.length) {
    this.resetContext()
    this.currentRequestIndex = 0
  }
  this.currentRequest = this.requests[this.currentRequestIndex]
  // only builds if it has dynamic setup
  if (this.reqDefaults.idReplacement || typeof this.currentRequest.setupRequest === 'function') {
    this.rebuildRequest()
  }
  return this.currentRequest
}

RequestIterator.prototype.nextRequestBuffer = function () {
  // get next request
  this.nextRequest()
  return this.currentRequest.requestBuffer
}

RequestIterator.prototype.setRequests = function (newRequests) {
  this.resetted = false
  this.requests = newRequests || [{}]
  this.currentRequestIndex = 0
  // build all request which don't have dynamic setup, except if it's the first one
  this.requests.forEach((request, i) => {
    this.currentRequest = request
    if (i === 0 || typeof request.setupRequest !== 'function') {
      this.rebuildRequest()
    }
  })
  this.currentRequest = this.requests[0]
}

RequestIterator.prototype.setHeaders = function (newHeaders) {
  this.headers = newHeaders || {}
  this.currentRequest.headers = this.headers
  this.rebuildRequest()
}

RequestIterator.prototype.setBody = function (newBody) {
  this.currentRequest.body = newBody || Buffer.alloc(0)
  this.rebuildRequest()
}

RequestIterator.prototype.setHeadersAndBody = function (newHeaders, newBody) {
  this.headers = newHeaders || {}
  this.currentRequest.headers = this.headers
  this.currentRequest.body = newBody || Buffer.alloc(0)
  this.rebuildRequest()
}

RequestIterator.prototype.setRequest = function (newRequest) {
  this.currentRequest = newRequest || {}
  this.rebuildRequest()
}

RequestIterator.prototype.rebuildRequest = function () {
  let data
  this.resetted = false
  if (this.currentRequest) {
    this.currentRequest.headers = this.currentRequest.headers || this.headers
    data = this.requestBuilder(this.currentRequest, this.context)
    if (data) {
      const hyperid = this.hyperid()
      this.currentRequest.requestBuffer = this.reqDefaults.idReplacement
        ? Buffer.from(data.toString()
          .replace(/\[<id>\]/g, hyperid)
          // in the first line only (the url), replace encoded id placeholders
          .replace(/^.+/, m => m.replace(/\[%3Cid%3E]/g, hyperid)))
        : data
    } else if (this.currentRequestIndex === 0) {
      // when first request fails to build, we can not reset pipeline, or it'll never end
      throw new Error('First setupRequest() failed did not returned valid request. Stopping')
    } else {
      this.currentRequestIndex = this.requests.length - 1
      this.nextRequest()
      this.resetted = true
    }
  }
  return data
}

RequestIterator.prototype.recordBody = function (request, status, body, headers) {
  if (request && typeof request.onResponse === 'function') {
    request.onResponse(status, body, this.context, toHeaderKeyValue(headers || []))
  }
}

module.exports = RequestIterator
