import type { Auth } from '../types'
import type { Middleware } from './index'
import { assign } from '../utils/index'

/**
 * Automatically configure your requests with basic auth
 *
 * Example:
 * In your manifest:
 * {
 *   middleware: [ BasicAuthMiddleware({ username: 'bob', password: 'bob' }) ]
 * }
 *
 * Making the call:
 * client.User.all()
 * // => header: "Authorization: Basic Ym9iOmJvYg=="
 */
export const BasicAuthMiddleware = (authConfig: Auth): Middleware =>
  function BasicAuthMiddleware() {
    return {
      async prepareRequest(next) {
        const request = await next()
        const auth = request.auth()
        return !auth // Keep the override
          ? request.enhance({ auth: assign({}, authConfig) })
          : request
      },
    }
  }
export default BasicAuthMiddleware
