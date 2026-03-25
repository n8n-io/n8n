import { invariant } from 'outvariant'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { HttpRequestEventMap, IS_PATCHED_MODULE } from '../../glossary'
import { Interceptor } from '../../Interceptor'
import { RequestController } from '../../RequestController'
import { emitAsync } from '../../utils/emitAsync'
import { handleRequest } from '../../utils/handleRequest'
import { canParseUrl } from '../../utils/canParseUrl'
import { createRequestId } from '../../createRequestId'
import { createNetworkError } from './utils/createNetworkError'
import { followFetchRedirect } from './utils/followRedirect'
import { decompressResponse } from './utils/decompression'
import { hasConfigurableGlobal } from '../../utils/hasConfigurableGlobal'
import { FetchResponse } from '../../utils/fetchUtils'

export class FetchInterceptor extends Interceptor<HttpRequestEventMap> {
  static symbol = Symbol('fetch')

  constructor() {
    super(FetchInterceptor.symbol)
  }

  protected checkEnvironment() {
    return hasConfigurableGlobal('fetch')
  }

  protected async setup() {
    const pureFetch = globalThis.fetch

    invariant(
      !(pureFetch as any)[IS_PATCHED_MODULE],
      'Failed to patch the "fetch" module: already patched.'
    )

    globalThis.fetch = async (input, init) => {
      const requestId = createRequestId()

      /**
       * @note Resolve potentially relative request URL
       * against the present `location`. This is mainly
       * for native `fetch` in JSDOM.
       * @see https://github.com/mswjs/msw/issues/1625
       */
      const resolvedInput =
        typeof input === 'string' &&
        typeof location !== 'undefined' &&
        !canParseUrl(input)
          ? new URL(input, location.origin)
          : input

      const request = new Request(resolvedInput, init)
      const responsePromise = new DeferredPromise<Response>()
      const controller = new RequestController(request)

      this.logger.info('[%s] %s', request.method, request.url)
      this.logger.info('awaiting for the mocked response...')

      this.logger.info(
        'emitting the "request" event for %s listener(s)...',
        this.emitter.listenerCount('request')
      )

      const isRequestHandled = await handleRequest({
        request,
        requestId,
        emitter: this.emitter,
        controller,
        onResponse: async (rawResponse) => {
          this.logger.info('received mocked response!', {
            rawResponse,
          })

          // Decompress the mocked response body, if applicable.
          const decompressedStream = decompressResponse(rawResponse)
          const response =
            decompressedStream === null
              ? rawResponse
              : new FetchResponse(decompressedStream, rawResponse)

          FetchResponse.setUrl(request.url, response)

          /**
           * Undici's handling of following redirect responses.
           * Treat the "manual" redirect mode as a regular mocked response.
           * This way, the client can manually follow the redirect it receives.
           * @see https://github.com/nodejs/undici/blob/a6dac3149c505b58d2e6d068b97f4dc993da55f0/lib/web/fetch/index.js#L1173
           */
          if (FetchResponse.isRedirectResponse(response.status)) {
            // Reject the request promise if its `redirect` is set to `error`
            // and it receives a mocked redirect response.
            if (request.redirect === 'error') {
              responsePromise.reject(createNetworkError('unexpected redirect'))
              return
            }

            if (request.redirect === 'follow') {
              followFetchRedirect(request, response).then(
                (response) => {
                  responsePromise.resolve(response)
                },
                (reason) => {
                  responsePromise.reject(reason)
                }
              )
              return
            }
          }

          if (this.emitter.listenerCount('response') > 0) {
            this.logger.info('emitting the "response" event...')

            // Await the response listeners to finish before resolving
            // the response promise. This ensures all your logic finishes
            // before the interceptor resolves the pending response.
            await emitAsync(this.emitter, 'response', {
              // Clone the mocked response for the "response" event listener.
              // This way, the listener can read the response and not lock its body
              // for the actual fetch consumer.
              response: response.clone(),
              isMockedResponse: true,
              request,
              requestId,
            })
          }

          responsePromise.resolve(response)
        },
        onRequestError: (response) => {
          this.logger.info('request has errored!', { response })
          responsePromise.reject(createNetworkError(response))
        },
        onError: (error) => {
          this.logger.info('request has been aborted!', { error })
          responsePromise.reject(error)
        },
      })

      if (isRequestHandled) {
        this.logger.info('request has been handled, returning mock promise...')
        return responsePromise
      }

      this.logger.info(
        'no mocked response received, performing request as-is...'
      )

      return pureFetch(request).then(async (response) => {
        this.logger.info('original fetch performed', response)

        if (this.emitter.listenerCount('response') > 0) {
          this.logger.info('emitting the "response" event...')

          const responseClone = response.clone()

          await emitAsync(this.emitter, 'response', {
            response: responseClone,
            isMockedResponse: false,
            request,
            requestId,
          })
        }

        return response
      })
    }

    Object.defineProperty(globalThis.fetch, IS_PATCHED_MODULE, {
      enumerable: true,
      configurable: true,
      value: true,
    })

    this.subscriptions.push(() => {
      Object.defineProperty(globalThis.fetch, IS_PATCHED_MODULE, {
        value: undefined,
      })

      globalThis.fetch = pureFetch

      this.logger.info(
        'restored native "globalThis.fetch"!',
        globalThis.fetch.name
      )
    })
  }
}
