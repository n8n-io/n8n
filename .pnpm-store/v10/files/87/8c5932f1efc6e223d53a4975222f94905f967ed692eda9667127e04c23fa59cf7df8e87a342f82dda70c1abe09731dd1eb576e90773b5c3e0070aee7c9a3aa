"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var mappersmith_exports = {};
__export(mappersmith_exports, {
  Response: () => import_response.Response,
  configs: () => configs,
  default: () => forge,
  forge: () => forge,
  setContext: () => setContext,
  version: () => import_version.version
});
module.exports = __toCommonJS(mappersmith_exports);
var import_client_builder = require("./client-builder");
var import_utils = require("./utils/index");
var import_response = require("./response");
var import_version = require("./version");
const configs = {
  context: {},
  middleware: [],
  Promise: typeof Promise === "function" ? Promise : null,
  fetch: typeof fetch === "function" ? fetch : null,
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
      configure: null
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
      onResponseEnd: null
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
      credentials: "omit"
    }
  }
};
const setContext = (context) => {
  console.warn(
    "The use of setContext is deprecated - you need to find another way to pass data between your middlewares."
  );
  configs.context = (0, import_utils.assign)(configs.context, context);
};
function forge(manifest) {
  const GatewayClassFactory = () => configs.gateway;
  return new import_client_builder.ClientBuilder(manifest, GatewayClassFactory, configs).build();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Response,
  configs,
  forge,
  setContext,
  version
});
//# sourceMappingURL=mappersmith.js.map