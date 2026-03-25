import { invariant } from 'outvariant'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { InterceptorError } from './InterceptorError'

const kRequestHandled = Symbol('kRequestHandled')
export const kResponsePromise = Symbol('kResponsePromise')

export class RequestController {
  /**
   * Internal response promise.
   * Available only for the library internals to grab the
   * response instance provided by the developer.
   * @note This promise cannot be rejected. It's either infinitely
   * pending or resolved with whichever Response was passed to `respondWith()`.
   */
  [kResponsePromise]: DeferredPromise<Response | Error | undefined>;

  /**
   * Internal flag indicating if this request has been handled.
   * @note The response promise becomes "fulfilled" on the next tick.
   */
  [kRequestHandled]: boolean

  constructor(private request: Request) {
    this[kRequestHandled] = false
    this[kResponsePromise] = new DeferredPromise()
  }

  /**
   * Respond to this request with the given `Response` instance.
   * @example
   * controller.respondWith(new Response())
   * controller.respondWith(Response.json({ id }))
   * controller.respondWith(Response.error())
   */
  public respondWith(response: Response): void {
    invariant.as(
      InterceptorError,
      !this[kRequestHandled],
      'Failed to respond to the "%s %s" request: the "request" event has already been handled.',
      this.request.method,
      this.request.url
    )

    this[kRequestHandled] = true
    this[kResponsePromise].resolve(response)

    /**
     * @note The request conrtoller doesn't do anything
     * apart from letting the interceptor await the response
     * provided by the developer through the response promise.
     * Each interceptor implements the actual respondWith/errorWith
     * logic based on that interceptor's needs.
     */
  }

  /**
   * Error this request with the given error.
   * @example
   * controller.errorWith()
   * controller.errorWith(new Error('Oops!'))
   */
  public errorWith(error?: Error): void {
    invariant.as(
      InterceptorError,
      !this[kRequestHandled],
      'Failed to error the "%s %s" request: the "request" event has already been handled.',
      this.request.method,
      this.request.url
    )

    this[kRequestHandled] = true

    /**
     * @note Resolve the response promise, not reject.
     * This helps us differentiate between unhandled exceptions
     * and intended errors ("errorWith") while waiting for the response.
     */
    this[kResponsePromise].resolve(error)
  }
}
