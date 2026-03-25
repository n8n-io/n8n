'use strict'

const { InvalidArgumentError } = require('../core/errors')
const Client = require('./client')

class H2CClient extends Client {
  constructor (origin, clientOpts) {
    if (typeof origin === 'string') {
      origin = new URL(origin)
    }

    if (origin.protocol !== 'http:') {
      throw new InvalidArgumentError(
        'h2c-client: Only h2c protocol is supported'
      )
    }

    const { connect, maxConcurrentStreams, pipelining, ...opts } =
            clientOpts ?? {}
    let defaultMaxConcurrentStreams = 100
    let defaultPipelining = 100

    if (
      maxConcurrentStreams != null &&
            Number.isInteger(maxConcurrentStreams) &&
            maxConcurrentStreams > 0
    ) {
      defaultMaxConcurrentStreams = maxConcurrentStreams
    }

    if (pipelining != null && Number.isInteger(pipelining) && pipelining > 0) {
      defaultPipelining = pipelining
    }

    if (defaultPipelining > defaultMaxConcurrentStreams) {
      throw new InvalidArgumentError(
        'h2c-client: pipelining cannot be greater than maxConcurrentStreams'
      )
    }

    super(origin, {
      ...opts,
      maxConcurrentStreams: defaultMaxConcurrentStreams,
      pipelining: defaultPipelining,
      allowH2: true,
      useH2c: true
    })
  }
}

module.exports = H2CClient
