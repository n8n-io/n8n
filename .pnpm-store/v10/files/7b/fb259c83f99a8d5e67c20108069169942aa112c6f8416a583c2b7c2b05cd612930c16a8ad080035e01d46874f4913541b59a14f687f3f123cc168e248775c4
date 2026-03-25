import type { Middleware } from './index'

export type Milliseconds = number

/**
 * Automatically configure your requests with a default timeout
 *
 * Example:
 * In your manifest:
 * {
 *   middleware: [ TimeoutMiddleware(500) ]
 * }
 *
 * You can still override the default value:
 * client.User.all({ timeout: 100 })
 */
export const TimeoutMiddleware = (timeoutValue: Milliseconds): Middleware =>
  function TimeoutMiddleware() {
    return {
      async prepareRequest(next) {
        const request = await next()
        const timeout = request.timeout()
        return !timeout // Keep the override
          ? request.enhance({ timeout: timeoutValue })
          : request
      },
    }
  }

export default TimeoutMiddleware
