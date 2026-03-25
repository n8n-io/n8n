'use strict'

const { STATUS_CODES } = require('http')

/**
 * Creates a Fetch API `Response` instance from the given
 * `http.IncomingMessage` instance.
 * Inspired by: https://github.com/mswjs/interceptors/blob/04152ed914f8041272b6e92ed374216b8177e1b2/src/interceptors/ClientRequest/utils/createResponse.ts#L8
 */

/**
 * Response status codes for responses that cannot have body.
 * @see https://fetch.spec.whatwg.org/#statuses
 */
const responseStatusCodesWithoutBody = [204, 205, 304]

/**
 * @param {import('http').IncomingMessage} message
 * @param {AbortSignal} signal
 */
function createResponse(message, signal) {
  const responseBodyOrNull = responseStatusCodesWithoutBody.includes(
    message.statusCode || 200,
  )
    ? null
    : new ReadableStream({
        start(controller) {
          message.on('data', chunk => controller.enqueue(chunk))
          message.on('end', () => controller.close())
          message.on('error', error => controller.error(error))
          signal.addEventListener('abort', () => message.destroy(signal.reason))
        },
        cancel() {
          message.destroy()
        },
      })

  const rawHeaders = new Headers()
  for (let i = 0; i < message.rawHeaders.length; i += 2) {
    rawHeaders.append(message.rawHeaders[i], message.rawHeaders[i + 1])
  }

  // @mswjs/interceptors supports rawHeaders. https://github.com/mswjs/interceptors/pull/598
  const response = new Response(responseBodyOrNull, {
    status: message.statusCode,
    statusText: message.statusMessage || STATUS_CODES[message.statusCode],
    headers: rawHeaders,
  })

  return response
}

module.exports = { createResponse }
