import type { Response } from '../response'
import type { Middleware } from './index'
import { configs } from '../index'

export type ErrorHandlerMiddlewareCallback = (response: Response) => boolean
let handler: ErrorHandlerMiddlewareCallback | null = null

export const setErrorHandler = (errorHandler: ErrorHandlerMiddlewareCallback) => {
  handler = errorHandler
}

/**
 * Provides a catch-all function for all requests. If the catch-all
 * function returns `true` it prevents the original promise to continue.
 */
export const GlobalErrorHandlerMiddleware: Middleware = () => ({
  response(next) {
    if (!configs.Promise) {
      return next()
    }

    return new configs.Promise((resolve, reject) => {
      next()
        .then((response) => resolve(response))
        .catch((response) => {
          let proceed = true
          handler && (proceed = !(handler(response) === true))
          proceed && reject(response)
        })
    })
  },
})

export default GlobalErrorHandlerMiddleware
