# Changelog

## 2.46.1

### Patch Changes

- bf6d9f7: Fixed a regression introduced in 2.46.0 regarding the module imports of the Node.js built-in http and https.
  They were changed to default imports in 2.45.0, in order to allow end users to apply patches to the native
  modules, and have Mappersmith use those patches. The switch back to namespace imports caused the import
  statement to return references to the original methods, thus ignoring any end user patches to those modules.

## 2.46.0

### Minor Changes

- e5b96ac: Fetch gateway will now send abort controller signal when timeout has been reached
- 9353c80: Automatically retry failed network errors
  - feat: add automatic retry for failed network request to Retry Middleware
  - feat: Allow `enableRetry` as a new config option to Retry Middleware

### Patch Changes

- f8b9add: Import built-in Node.js modules using `import * as` syntax

## 2.45.0

### Minor Changes

- 624c15d: Switch to using default imports for libraries imported in gateway

## 2.44.0

### Minor Changes

- 3a3c092: # Add support for abort signals

  The [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) interface represents a signal object that allows you to communicate with an asynchronous operation (such as a fetch request) and abort it if required via an AbortController object. All gateway APIs (Fetch, HTTP and XHR) support this interface via the `signal` parameter:

  ```javascript
  const abortController = new AbortController()
  // Start a long running task...
  client.Bitcoin.mine({ signal: abortController.signal })
  // This takes too long, abort!
  abortController.abort()
  ```

  # Minor type fixes

  The return value of some functions on `Request` have been updated to highlight that they might return undefined:
  - `Request#body()`
  - `Request#auth()`
  - `Request#timeout()`

  The reasoning behind this change is that if you didn't pass them (and no middleware set them) they might simply be undefined. So the types were simply wrong before. If you experience a "breaking change" due to this change, then it means you have a potential bug that you didn't properly handle before.

## 2.43.4

### Patch Changes

- 7356e30: Expose deep imports for backwards compatibility

## 2.43.3

### Patch Changes

- 404f7ba: Exporting client-builder

## 2.43.2

### Patch Changes

- 0b832ab: Fix ESM build to output correct code as per ESM spec

## 2.43.1

### Patch Changes

- 0177911: Fixes `middlewares` import path

## 2.43.0

### Minor Changes

- 6e94f97: Bundle with ESM exports.
  - The recommended way to use mappersmith in ESM projects is to do `import { forge } from 'mappersmith'` rather than the old `import forge from 'mappersmith'`. The reason is because test runners like jest and vitest might get confused when mixing named/default exports together with ESM, even though tsc and node has no problems with it.
  - A similar recommendation change goes for importing middleware: do `import { EncodeJsonMiddleware } from 'mappersmith/middleware'` (note the `mappersmith/middleware` folder) rather than deep import `import EncodeJsonMiddleware from 'mappersmith/middleware/encode-json'`. We still support the old import, but it will be deprecated in the future.
  - The same recommendation goes for importing gateway: do `import { FetchGateway } from 'mappersmith/gateway'` (note the `mappersmith/gateway` folder) rather than deep import `import FetchGateway from 'mappersmith/gateway/fetch'`. We still support the old import, but it will be deprecated in the future.

- 9da82f6: Fixes memory leak when using http(s) agent with keep-alive

### Patch Changes

- e01114f: Fixed missing type declaration for `unusedMocks`

## 2.42.0

### Minor Changes

- `mappersmith`: `EncodeJSON` middleware now properly serializes `+json` family of content-types #362

## 2.41.0

Fixed:

- `mappersmith`: Allow path to be empty string in manifest #327
- `mappersmith`: `Response.errors` should only be allowed to contain `Error` or `string` #325

Added:

- `mappersmith`: Accept `path` as a resource method param #328
- `mappersmith`: A forged client now optionally accepts request context as its second argument #330
- `mappersmith`: Add support for accessing the final request object in middleware response phase #321

## 2.40.0

Fixed:

- `mappersmith/test`: Properly merge headers when one of the sides is a mock matcher #316

Added:

- `mappersmith`: Add support for passing transient contexts between middleware #320

## 2.39.1

Fixed:

- `mappersmith`: Typo in basic auth import no longer causes build errors #313

## 2.39.0

Added:

- `mappersmith`: Added service workers support with default gateway `fetch` #311

Refactored:

- `mappersmith`: Migrated `middleware` to typescript #306

## 2.38.1

Fixed:

- `mappersmith`: Preserve `rawData` as empty string instead of converting it to null #297
- `mappersmith/test`: Allow `Buffer` (and similar) as valid response data for `mockRequest` #299
- `mappersmith`: Ensure references to `regeneratorRuntime` is not part of compiled bundle #303

## 2.38.0

Added:

- `mappersmith/test`: `mockClient` responses are now clones of the fixture instead of references to them #158
- `mappersmith/*`: Move typings into src folder next to each file it describes #291
- `mappersmith`: Convert Gateway to typescript #287
- `mappersmith`: Add the possibility to update the default encoding function for query params #296

## 2.37.1

Fixed:

- (internal) Fixed bad release folder of 2.37.0

## 2.37.0

Fixed:

- `mappersmith/test`: Fix bug in mockRequest/mockClient where body params did not match independent of order #268

Added:

- `mappersmith`: Make Response accept a generic type that specifies the form of the data returned #265
- `mappersmith/test`: Add `responseFactory` and `requestFactory` helpers to `mappersmith/test` #265
- `mappersmith/test`: If `body` is not provided to a mock, it will match on any body. #229 #152

## 2.36.5

Fixed:

- (internal) Fixed bad release folder of 2.36.4

## 2.36.4

- `mappersmith`: Fix unintended new query string behaviour introduced in 2.36 #281

## 2.36.3

Fixed:

- Fix missing retry-v2 typings in index.d.ts #261

Refactored:

- Migrated `ClientBuilder` to typescript #259

## 2.36.1

Fixed:

- Fix broken typings in index.d.ts #257

## 2.36.0

Added:

- Add option `parameterEncoder` which can optionally be used to override the encoding function for request params. Default is `encodeURIComponent` #251

Fixed:

- Fix `x-started-at` header getting set to new `Date.now()` during testing and failing header match #248
- Fix `Request.pathTemplate` to return result of the function instead of the function itself #249

Refactored:

- Migrated `Manifest` to typescript #254
- Migrated `MethodDescriptor` to typescript #245
- Migrated `Request` to typescript #245
- Migrated `Response` to typescript #249

## 2.35.0

Fixed:

- Respect `allowResourceHostOverride` configuration in middlewares #240
- A successful middleware should no longer overwriting a previous middleware's `error` #230

Added:

- `mappersmith`: `Request.pathTemplate` - Returns the template path, without params, before interpolation #194
- `mappersmith/test`: `unusedMocks` - get count of unused mocks #227
- The `+json` family of MIME types are parsed as json #223
- Add headers to mock matching strategy #168

Deprecated:

- `mappersmith`: `setContext` - this is not safe for concurrent use #239

## 2.34.0

- Add json-encode middleware export `CONTENT_TYPE_JSON` to type definition #203
- Only accept host overrides if `allowResourceHostOverride=true` #204

## 2.33.3

- Fix `GatewayConfiguration` typings

## 2.33.2

- Add `enableHTTP408OnTimeouts` to `HTTPGatewayConfiguration` typings

## 2.33.1

- Use latest request in response mock #191

## 2.33.0

- Add support for (Typescript) boolean as parameters #185
- Update typings for HTTPGateway configurations #182
- Accept a function as `MethodDescriptor.path` #186

## 2.32.1

- Bugfix: Only use param matchers on the attributes assigned to them #181

## 2.32.0

- New option on the HTTP gateway (`useSocketConnectionTimeout`) to include DNS and Socket connection on the timeout #179

## 2.31.2

- Bugfix: Preserve `timeElapsed` for `response.enhance` #178

## 2.31.1

- Ignore `null` or `undefined` values for dynamic segments #175

## 2.31.0

- Bugfix: Fetch gateway not using the right configs #161
- Bugfix: Regexp injection vulnerability #171
- Lazy-match body to not trigger body-matching callback unnecessarily #163
- Allow not sending a config in the Retry middleware #164
- Fix `mockRequest.url` type #166
- Fix MockClient types #170
- Add support for optional path parameters #171
- Replace multiple instances of same path parameter #174

## 2.30.1

- Remove type GlobalFetch from FetchGateway #155

## 2.30.0

- Add `ignoreGlobalMiddleware` to typescript type definitions #148
- Update `EncodeJson` middleware to not override pre-existing content-type #149
- Accept host as a resource method param #151

## 2.29.3

- Bugfix: Encode dynamic section params #141

## 2.29.2

- Add `clear` and `m` TypeScript definitions

## 2.29.1

- Add `mockRequest` TypeScript definitions

## 2.29.0

- Ability to define middleware on resource level #134
- Add TypeScript definitions #136

## 2.28.0

- Add socket and response callbacks to the HTTP Gateway to allow for timing request stages #127
- Allow use of `mockRequest` and `mockClient` with params/body that are independent of order #121

## 2.27.2

- Bugfix: Fix "ReferenceError: regeneratorRuntime is not defined" when importing "mappersmith/test" #131

## 2.27.1

- Bugfix: `mockRequest` would attempt to run the old request phase without considering async definitions #130

## 2.27.0

- Add `prepareRequest` phase to middleware #129

## 2.26.1

- Bugfix: Extra query string when path already contains query string #128

## 2.26.0

- Add async middleware requests support to mocked clients #122

## 2.25.1

- Allow setting of some resource configs at manifest level #114
- Bugfix: Reject the promise when using the retry middleware and another middleware on the stack throws an error #118

## 2.25.0

- Returns HTTP 408 (instead of 400) when request times out #88

## 2.24.1

- Bugfix: Plain object response data is not stringified on subsequent mock requests #107

## 2.24.0

- Add response callback support to `mockClient` #91
- Add status callback support to `mockClient` #105

## 2.23.0

- Add a way to rename queryparams (`queryParamAlias`) #102

## 2.22.2

- Cache some RegExp to improve overall performance

## 2.22.1

- Bugfix: Abort requests on timeout (http gateway)

## 2.22.0

- Improve "network error" handling #99
- Send error instance to `gateway#dispatchClientError` #99

## 2.21.0

- Throw errors when the middleware request phase fails
  - If the request phase throws an error (e.g.: `[Mappersmith] middleware "MyMiddleware" failed in the request phase: <Original error message>`)
  - If the request phase returns something different than a mappersmith Request object (e.g.: `[Mappersmith] middleware "MyMiddleware" should return "Request" but returned "boolean"`)

## 2.20.0

- Allow retries on successful calls
- Add the ability to re-run the middleware stack from the response phase (renew)
- Add Request#header to get a single header value by name

## 2.19.0

- Add support for HEAD HTTP method #90
- Bugfix: Calculate `Ended-At` after evaluating `next` in the duration middleware

## 2.18.0

- Add support to binary payloads when using fetch gateway #89

## 2.17.0

- Add support to async middleware request phase #86
- Ensures all middleware expose name #83

## 2.16.1

- Bugfix: Use uppercase HTTP methods with XHR. CORS preflight requests will fail if the method name doesn't match #80

## 2.16.0

- Add Retry middleware v2 which doesn't use a global retry configuration #79

## 2.15.1

- Retry middleware: by default don't retry requests with statuses < 500 #78

## 2.15.0

- Add option to ignore global middleware
- Bugfix: Ignore Node.js files when bundling the client

## 2.14.3

- Bugfix: fix issue when mocking clients with middleware that use context #77

## 2.14.2

- Bugfix: fix IE binary request by configuring responseType after open #76
- Enable Windows integration tests via Appveyor #75

## 2.14.1

- Add current version to main module

## 2.14.0

- Add `clientId` to help identify different clients #73
- Add global context to help with request life cycle #73

## 2.13.0

- Add a retry validation callback to the Retry Middleware #72

## 2.12.0

- Renames middlewares folder to middleware, but keep importable files
- Add globally defined middleware

## 2.11.2

- Bugfix: fix CSRF middleware cookie parser #69
- Add `uuid4` matcher to the test library

## 2.11.1

**This version was removed from NPM because the test library wasn't included to the final bundle**

## 2.11.0

**This version was removed from NPM because the test library wasn't included to the final bundle**

## 2.10.0

- Adds CSRF middleware #68

## 2.9.2

- bugfix: Fix param matchers for mockClient

## 2.9.1

- bugfix: Auth mask was mutating the auth config #65

## 2.9.0

- Add support to binary payloads #64
- Switch tests to chrome-headless #63

## 2.8.0

- Mask auth password in the Response object #60

## 2.7.0

- Scope `gatewayConfigs` to allow different instances of mappersmith clients to use different configurations

## 2.6.1

- bugfix: HTTP Gateway was calculating `content-length` wrongly #59

## 2.6.0

- Remove `performance.now` polyfill to allow the use with web workers #55

## 2.5.1

- Change the HTTP gateway to use the built-in [request#setTimeout](https://nodejs.org/api/http.html#http_request_settimeout_timeout_callback)

## 2.5.0

- Accept a matcher function as an URL in `mockRequest`
- Add a `configure` callback to the `http` gateway

## 2.4.0

- Adds Duration middleware #50

## 2.3.1

- bugfix: eval('process') causes some problems in strict mode on PhantomJS #51

## 2.3.0

- Allow `mockClient` and `mockRequest` to use match functions to check body #49
- Add match functions to the test module #49

## 2.2.1

- bugfix: body, auth and timeout were always being replaced by `request#enhance`

## 2.2.0

- Add support to basic auth for all gateways #46
- Add `BasicAuthMiddleware` to configure a default basic auth #46
- Add support to timeout for all gateways #47
- Add `TimeoutMiddleware` to configure a default timeout #47

## 2.1.0

- Add a retry middleware with exponential retry time #38
- Add a new gateway backed by `fetch` #42
- Add `Response#header` to get a single header value by name

## 2.0.1

- bugfix: Send `resourceName` and `resourceMethod` when running the test lib
- Add flag (`mockRequest`) when executing the middlewares from the test lib

## 2.0.0

- Expose `resourceName` and `resourceMethod` to middlewares
- Features from 2.0.0-rc1 to 2.0.0-rc7

## 2.0.0-rc7

- bugfix: EncodeJSON middleware was only returning requests if the original request had a body or caused an error
- Prevent method clear from the test lib to expose the internal store
- Normalize `responseData` to be always `null` when not defined
- Make `mockClient` independent of the `response` call

## 2.0.0-rc6

- bugfix: `MockClient` should use the same middlewares configured in the client #37

## 2.0.0-rc5

- bugfix: `ClientBuilder` isn't using the new configured gateway when `config.gateway` changes #36

## 2.0.0-rc4

- Fix regression introduced in rc3, disable gateway http when transpiling for browser

## 2.0.0-rc3

- Publish only `lib` to NPM

## 2.0.0-rc2

- Add `content-length` only for gateway http #35
- Eval `process` to avoid webpack polyfills

## 2.0.0-rc1

- New API
- New test library
- Middlewares

## 0.13.4

- Add yarn.lock
- bugfix: duplicated `content-type` on vanilla gateway #32

## 0.13.3

- Included beforeSend callback, this should be configured through Global configurations and URL matching. It will follow the same behavior as the processor callback
- bugfix: some body parsers are super strict and will fail if charset has a “;” termination. PR #26 introduced this bug trying to solve issue #27

## 0.13.2

- bugfix: prioritizes user-defined content-type header even for post/put/patch/delete methods. `application/x-www-form-urlencoded` is not forced if Content-Type header is defined.

## 0.13.1

- bugfix: wrong `content-type` on vanilla gateway, a semicolon was missing on `charset=UTF-8`

## 0.13.0

- Included status code for success calls
- `withCredentials` option for `VanillaGateway` and `JQueryGateway`
- Method to configure a global success handler per client
- bugfix: rules matcher now uses full URL instead of descriptor path

## 0.12.1

- Optional callback parameter when passing options to gateway. Check the section "Specifics of each gateway" for more info

## 0.12.0

- Included request and response headers into stats object
- Included a way to assign headers directly from method calls

## 0.11.0

- Method to configure a global error handler per client
- Included status code in the error request object

## 0.10.0

- Bult-in fixture support
- Holding error stack for better debugging

## 0.9.0

- Allows Promise implementation to be configured, defaults to global Promise
- Headers option for all gateways

## 0.8.1

- bugfix: support for https in `NodeVanillaGateway`

## 0.8.0

- Support for Promises
- bugfix: made headers from options higher priority than built-in headers
- Fail callback now receives the requested resource (url, host, path and params). This change breaks the API for fail callback, the original error objects will be available from the second argument and beyond

## 0.7.0

- Included host and path into stats object

## 0.6.0

- Improved package size
- Included url and params into stats object
- Support for alternative hosts for each resource method
- Ability to disable host resolution

## 0.5.0

- Measure of the time elapsed between the request and the callback invocation
- Stats object for success callbacks

## 0.4.1

- bugfix: VanillaGateway doesn't parse JSON responses

## 0.4.0

- Support for Node vanilla gateway

## 0.3.0

- Ability to configure default parameters for resources

## 0.2.1

- bugfix: fixed typo

## 0.2.0

- Support for emulateHTTP
- Support for global configurations and per url match configurations
- Support for POST, PUT, PATCH and DELETE methods
- Exposed body value to gateway
- Option to change the bodyAttr name
- Processor functions for resources
- Exposed request params to the gateway to allow o POST, PUT, etc
- Compact syntax (syntatic sugar for GET methods)

## 0.1.1

- bugfix: fixed reference of Mapper and VanillaGateway in index.js

## 0.1.0

- Basic structure with Jquery and Vanilla gateways
- Support for GET method
