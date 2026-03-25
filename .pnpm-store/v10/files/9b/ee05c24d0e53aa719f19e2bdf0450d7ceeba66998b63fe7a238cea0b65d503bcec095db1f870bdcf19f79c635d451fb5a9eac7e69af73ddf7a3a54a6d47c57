import { ClientBuilder, Client } from './client-builder'
import { assign } from './utils/index'
import { GlobalConfigs, ManifestOptions, ResourceTypeConstraint } from './manifest'
import { Context } from './middleware/index'

/**
 * Can be used to test for `instanceof Response`
 */
export { Response } from './response'

export { version } from './version'

export const configs: GlobalConfigs = {
  context: {},
  middleware: [],
  Promise: typeof Promise === 'function' ? Promise : null,
  fetch: typeof fetch === 'function' ? fetch : null,

  /**
   * The maximum amount of executions allowed before it is considered an infinite loop.
   * In the response phase of middleware, it's possible to execute a function called "renew",
   * which can be used to rerun the middleware stack. This feature is useful in some scenarios,
   * for example, re-fetching an invalid access token.

   * This configuration is used to detect infinite loops, don't increase this value too much
   * @default 2
   */
  maxMiddlewareStackExecutionAllowed: 2,

  /**
   * Gateway implementation, it defaults to "lib/gateway/xhr" for browsers and
   * "lib/gateway/http" for node
   */
  gateway: null,
  gatewayConfigs: {
    /**
     * Setting this option will fake PUT, PATCH and DELETE requests with a HTTP POST. It will
     * add "_method" and "X-HTTP-Method-Override" with the original requested method
     * @default false
     */
    emulateHTTP: false,

    /**
     * Setting this option will return HTTP status 408 (Request Timeout) when a request times
     * out. When "false", HTTP status 400 (Bad Request) will be used instead.
     * @default false
     */
    enableHTTP408OnTimeouts: false,

    XHR: {
      /**
       * Indicates whether or not cross-site Access-Control requests should be made using credentials
       * such as cookies, authorization headers or TLS client certificates.
       * Setting withCredentials has no effect on same-site requests
       *
       * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials
       *
       * @default false
       */
      withCredentials: false,

      /**
       * For additional configurations to the XMLHttpRequest object.
       * @param {XMLHttpRequest} xhr
       * @default null
       */
      configure: null,
    },

    HTTP: {
      /**
       * Enable this option to evaluate timeout on entire request durations,
       * including DNS resolution and socket connection.
       *
       * See original nodejs issue: https://github.com/nodejs/node/pull/8101
       *
       * @default false
       */
      useSocketConnectionTimeout: false,
      /**
       * For additional configurations to the http/https module
       * For http: https://nodejs.org/api/http.html#http_http_request_options_callback
       * For https: https://nodejs.org/api/https.html#https_https_request_options_callback
       *
       * @param {object} options
       * @default null
       */
      configure: null,
      onRequestWillStart: null,
      onRequestSocketAssigned: null,
      onSocketLookup: null,
      onSocketConnect: null,
      onSocketSecureConnect: null,
      onResponseReadable: null,
      onResponseEnd: null,
    },

    Fetch: {
      /**
       * Indicates whether the user agent should send cookies from the other domain in the case of cross-origin
       * requests. This is similar to XHR’s withCredentials flag, but with three available values (instead of two):
       *
       * "omit": Never send cookies.
       * "same-origin": Only send cookies if the URL is on the same origin as the calling script.
       * "include": Always send cookies, even for cross-origin calls.
       *
       * https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
       *
       * @default "omit"
       */
      credentials: 'omit',
    },
  },
}

/**
 * @deprecated Shouldn't be used, not safe for concurrent use.
 * @param {Object} context
 */
export const setContext = (context: Context) => {
  console.warn(
    'The use of setContext is deprecated - you need to find another way to pass data between your middlewares.'
  )
  configs.context = assign(configs.context, context)
}

export default function forge<Resources extends ResourceTypeConstraint>(
  manifest: ManifestOptions<Resources>
): Client<Resources> {
  const GatewayClassFactory = () => configs.gateway
  return new ClientBuilder(manifest, GatewayClassFactory, configs).build()
}

export { forge }
