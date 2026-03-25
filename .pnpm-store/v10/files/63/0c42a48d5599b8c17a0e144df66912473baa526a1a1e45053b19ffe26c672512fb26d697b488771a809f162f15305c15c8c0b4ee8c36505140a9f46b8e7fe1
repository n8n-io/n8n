'use strict'

/**
 * A queue (FIFO) to hold pipelined requests and link metadata to them as the response is received from the server.
 * This facilitates the handling of responses when the HTTP requests are pipelined.
 * A queue is the best structure for this because the sever reponses are provided in the same order as the requests
 * Cf. https://en.wikipedia.org/wiki/HTTP_pipelining
 *
 * /!\ it's up to you as a user to ensure that the queue is populated if using
 * the functionality. This implementation will fail silently if e.g. you try to
 * call any function accessing the queue while it's empty.
 */
class PipelinedRequestsQueue {
  constructor () {
    this.pendingRequests = []
  }

  insertRequest (req) {
    this.pendingRequests.push({
      req,
      bytes: 0,
      body: '',
      headers: {},
      startTime: process.hrtime()
    })
  }

  peek () {
    if (this.pendingRequests.length > 0) {
      return this.pendingRequests[0]
    }
  }

  addByteCount (count) {
    const req = this.peek()
    if (req) {
      req.bytes += count
    }
  }

  addBody (data) {
    const req = this.peek()
    if (req) {
      req.body += data
    }
  }

  setHeaders (headers) {
    const req = this.peek()
    if (req) {
      req.headers = headers
    }
  }

  size () {
    return this.pendingRequests.length
  }

  /** Terminates the first-in request
   * This will calculate the request duration, remove it from the queue and return its data
   **/
  terminateRequest () {
    if (this.pendingRequests.length > 0) {
      const data = this.pendingRequests.shift()
      const hrduration = process.hrtime(data.startTime)
      data.duration = hrduration[0] * 1e3 + hrduration[1] / 1e6
      return data
    }
  }

  clear () {
    this.pendingRequests = []
  }

  toArray () {
    return this.pendingRequests
  }
}

module.exports = PipelinedRequestsQueue
