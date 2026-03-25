import type { Emitter } from 'strict-event-emitter'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { until } from '@open-draft/until'
import type { HttpRequestEventMap } from '../glossary'
import { emitAsync } from './emitAsync'
import { kResponsePromise, RequestController } from '../RequestController'
import {
  createServerErrorResponse,
  isResponseError,
  ResponseError,
} from './responseUtils'
import { InterceptorError } from '../InterceptorError'
import { isNodeLikeError } from './isNodeLikeError'

interface HandleRequestOptions {
  requestId: string
  request: Request
  emitter: Emitter<HttpRequestEventMap>
  controller: RequestController

  /**
   * Called when the request has been handled
   * with the given `Response` instance.
   */
  onResponse: (response: Response) => void | Promise<void>

  /**
   * Called when the request has been handled
   * with the given `Response.error()` instance.
   */
  onRequestError: (response: ResponseError) => void

  /**
   * Called when an unhandled error happens during the
   * request handling. This is never a thrown error/response.
   */
  onError: (error: unknown) => void
}

/**
 * @returns {Promise<boolean>} Indicates whether the request has been handled.
 */
export async function handleRequest(
  options: HandleRequestOptions
): Promise<boolean> {
  const handleResponse = async (response: Response | Error) => {
    if (response instanceof Error) {
      options.onError(response)
    }

    // Handle "Response.error()" instances.
    else if (isResponseError(response)) {
      options.onRequestError(response)
    } else {
      await options.onResponse(response)
    }

    return true
  }

  const handleResponseError = async (error: unknown): Promise<boolean> => {
    // Forward the special interceptor error instances
    // to the developer. These must not be handled in any way.
    if (error instanceof InterceptorError) {
      throw result.error
    }

    // Support mocking Node.js-like errors.
    if (isNodeLikeError(error)) {
      options.onError(error)
      return true
    }

    // Handle thrown responses.
    if (error instanceof Response) {
      return await handleResponse(error)
    }

    return false
  }

  // Add the last "request" listener to check if the request
  // has been handled in any way. If it hasn't, resolve the
  // response promise with undefined.
  options.emitter.once('request', ({ requestId: pendingRequestId }) => {
    if (pendingRequestId !== options.requestId) {
      return
    }

    if (options.controller[kResponsePromise].state === 'pending') {
      options.controller[kResponsePromise].resolve(undefined)
    }
  })

  const requestAbortPromise = new DeferredPromise<void, unknown>()

  /**
   * @note `signal` is not always defined in React Native.
   */
  if (options.request.signal) {
    if (options.request.signal.aborted) {
      requestAbortPromise.reject(options.request.signal.reason)
    } else {
      options.request.signal.addEventListener(
        'abort',
        () => {
          requestAbortPromise.reject(options.request.signal.reason)
        },
        { once: true }
      )
    }
  }

  const result = await until(async () => {
    // Emit the "request" event and wait until all the listeners
    // for that event are finished (e.g. async listeners awaited).
    // By the end of this promise, the developer cannot affect the
    // request anymore.
    const requestListtenersPromise = emitAsync(options.emitter, 'request', {
      requestId: options.requestId,
      request: options.request,
      controller: options.controller,
    })

    await Promise.race([
      // Short-circuit the request handling promise if the request gets aborted.
      requestAbortPromise,
      requestListtenersPromise,
      options.controller[kResponsePromise],
    ])

    // The response promise will settle immediately once
    // the developer calls either "respondWith" or "errorWith".
    const mockedResponse = await options.controller[kResponsePromise]
    return mockedResponse
  })

  // Handle the request being aborted while waiting for the request listeners.
  if (requestAbortPromise.state === 'rejected') {
    options.onError(requestAbortPromise.rejectionReason)
    return true
  }

  if (result.error) {
    // Handle the error during the request listener execution.
    // These can be thrown responses or request errors.
    if (await handleResponseError(result.error)) {
      return true
    }

    // If the developer has added "unhandledException" listeners,
    // allow them to handle the error. They can translate it to a
    // mocked response, network error, or forward it as-is.
    if (options.emitter.listenerCount('unhandledException') > 0) {
      // Create a new request controller just for the unhandled exception case.
      // This is needed because the original controller might have been already
      // interacted with (e.g. "respondWith" or "errorWith" called on it).
      const unhandledExceptionController = new RequestController(
        options.request
      )

      await emitAsync(options.emitter, 'unhandledException', {
        error: result.error,
        request: options.request,
        requestId: options.requestId,
        controller: unhandledExceptionController,
      }).then(() => {
        // If all the "unhandledException" listeners have finished
        // but have not handled the response in any way, preemptively
        // resolve the pending response promise from the new controller.
        // This prevents it from hanging forever.
        if (
          unhandledExceptionController[kResponsePromise].state === 'pending'
        ) {
          unhandledExceptionController[kResponsePromise].resolve(undefined)
        }
      })

      const nextResult = await until(
        () => unhandledExceptionController[kResponsePromise]
      )

      /**
       * @note Handle the result of the unhandled controller
       * in the same way as the original request controller.
       * The exception here is that thrown errors within the
       * "unhandledException" event do NOT result in another
       * emit of the same event. They are forwarded as-is.
       */
      if (nextResult.error) {
        return handleResponseError(nextResult.error)
      }

      if (nextResult.data) {
        return handleResponse(nextResult.data)
      }
    }

    // Otherwise, coerce unhandled exceptions to a 500 Internal Server Error response.
    options.onResponse(createServerErrorResponse(result.error))
    return true
  }

  /**
   * Handle a mocked Response instance.
   * @note That this can also be an Error in case
   * the developer called "errorWith". This differentiates
   * unhandled exceptions from intended errors.
   */
  if (result.data) {
    return handleResponse(result.data)
  }

  // In all other cases, consider the request unhandled.
  // The interceptor must perform it as-is.
  return false
}
