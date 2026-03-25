'use strict'

const { Transform } = require('node:stream')
const { Console } = require('node:console')

const PERSISTENT = process.versions.icu ? '✅' : 'Y '
const NOT_PERSISTENT = process.versions.icu ? '❌' : 'N '

/**
 * Gets the output of `console.table(…)` as a string.
 */
module.exports = class PendingInterceptorsFormatter {
  constructor ({ disableColors } = {}) {
    this.transform = new Transform({
      transform (chunk, _enc, cb) {
        cb(null, chunk)
      }
    })

    this.logger = new Console({
      stdout: this.transform,
      inspectOptions: {
        colors: !disableColors && !process.env.CI
      }
    })
  }

  format (pendingInterceptors) {
    const withPrettyHeaders = pendingInterceptors.map(
      ({ method, path, data: { statusCode }, persist, times, timesInvoked, origin }) => ({
        Method: method,
        Origin: origin,
        Path: path,
        'Status code': statusCode,
        Persistent: persist ? PERSISTENT : NOT_PERSISTENT,
        Invocations: timesInvoked,
        Remaining: persist ? Infinity : times - timesInvoked
      }))

    this.logger.table(withPrettyHeaders)
    return this.transform.read().toString()
  }
}
