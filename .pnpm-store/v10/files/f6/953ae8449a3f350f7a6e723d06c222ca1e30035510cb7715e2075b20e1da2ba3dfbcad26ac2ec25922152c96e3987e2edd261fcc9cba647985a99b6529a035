[![npm version](https://badge.fury.io/js/mappersmith.svg)](http://badge.fury.io/js/mappersmith)
[![Node.js CI](https://github.com/tulios/mappersmith/actions/workflows/node.js.yml/badge.svg)](https://github.com/tulios/mappersmith/actions/workflows/node.js.yml)
[![Windows Tests](https://img.shields.io/appveyor/ci/tulios/mappersmith.svg?label=Windows%20Tests)](https://ci.appveyor.com/project/tulios/mappersmith)
# Mappersmith

__Mappersmith__ is a lightweight rest client for node.js and the browser. It creates a client for your API, gathering all configurations into a single place, freeing your code from HTTP configurations.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Commonjs](#commonjs)
  - [Configuring my resources](#resource-configuration)
    - [Parameters](#parameters)
    - [Default parameters](#default-parameters)
    - [Body](#body)
    - [Headers](#headers)
    - [Basic Auth](#basic-auth)
    - [Timeout](#timeout)
    - [Abort Signal](#abort-signal)
    - [Alternative host](#alternative-host)
    - [Alternative path](#alternative-path)
    - [Binary data](#binary-data)
  - [Promises](#promises)
  - [Response object](#response-object)
  - [Middleware](#middleware)
    - [Creating middleware](#creating-middleware)
      - [Context (deprecated)](#context)
      - [Optional arguments](#creating-middleware-optional-arguments)
        - [mockRequest](#creating-middleware-optional-arguments-mock-request)
        - [Abort](#creating-middleware-optional-arguments-abort)
        - [Renew](#creating-middleware-optional-arguments-renew)
        - [request](#creating-middleware-optional-arguments-request)
    - [Configuring middleware](#configuring-middleware)
      - [Resource level middleware](#resource-middleware)
      - [Client level middleware](#client-middleware)
      - [Global middleware](#global-middleware)
    - [Built-in middleware](#built-in-middleware)
      - [BasicAuth](#middleware-basic-auth)
      - [CSRF](#middleware-csrf)
      - [Duration](#middleware-duration)
      - [EncodeJSON](#middleware-encode-json)
      - [GlobalErrorHandler](#middleware-global-error-handler)
      - [Log](#middleware-log)
      - [Retry](#middleware-retry)
      - [Timeout](#middleware-timeout)
    - [Middleware legacy notes](#middleware-legacy-notes)
  - [Testing Mappersmith](#testing-mappersmith)
  - [Gateways](#gateways)
  - [TypeScript](#typescript)
- [Development](#development)

## <a name="installation"></a> Installation

```sh
npm install mappersmith --save
```

or

```sh
yarn add mappersmith
```

#### Build from the source

Install the dependencies

```sh
yarn
```

Build

```sh
yarn build
yarn release # for minified version
```

## <a name="usage"></a> Usage

To create a client for your API you will need to provide a simple manifest. If your API reside in the same domain as your app you can skip the `host` configuration. Each resource has a name and a list of methods with its definitions, like:

```typescript
import forge, { configs } from "mappersmith"
import { Fetch } from "mappersmith/gateway/fetch"

configs.gateway = Fetch;

const github = forge({
  clientId: "github",
  host: "https://www.githubstatus.com",
  resources: {
    Status: {
      current: { path: "/api/v2/status.json" },
      summary: { path: "/api/v2/summary.json" },
      components: { path: "/api/v2/components.json" },
    },
  },
});

github.Status.current().then((response) => {
  console.log(`summary`, response.data());
});
```

## <a name="commonjs"></a> Commonjs

If you are using _commonjs_, your `require` should look like:

```javascript
const forge = require("mappersmith").default;
const { configs } = require("mappersmith");
const FetchGateway = require("mappersmith/gateway/fetch").default;
```

## <a name="resource-configuration"></a> Configuring my resources

Each resource has a name and a list of methods with its definitions. A method definition can have host, path, method, headers, params, bodyAttr, headersAttr and authAttr. Example:

```javascript
const client = forge({
  resources: {
    User: {
      all: { path: '/users' },

      // {id} is a dynamic segment and will be replaced by the parameter "id"
      // when called
      byId: { path: '/users/{id}' },

      // {group} is also a dynamic segment but it has default value "general"
      byGroup: { path: '/users/groups/{group}', params: { group: 'general' } },

      // {market?} is an optional dynamic segment. If called without a value
      // for the "market" parameter, {market?} will be removed from the path
      // including any prefixing "/".
      // This example: '/{market?}/users' => '/users'
      count: { path: '/{market?}/users' } }
    },
    Blog: {
      // The HTTP method can be configured through the `method` key, and a default
      // header "X-Special-Header" has been configured for this resource
      create: { method: 'post', path: '/blogs', headers: { 'X-Special-Header': 'value' } },

      // There are no restrictions for dynamic segments and HTTP methods
      addComment: { method: 'put', path: '/blogs/{id}/comment' },

      // `queryParamAlias` will map parameter names to their alias when
      // constructing the query string
      bySubject: { path: '/blogs', queryParamAlias: { subjectId: 'subject_id' } },

      // `path` is a function to map passed params to a custom path
      byDate: { path: ({date}) => `${date.getYear()}/${date.getMonth()}/${date.getDate()}` }
    }
  }
})
```

### <a name="parameters"></a> Parameters

If your method doesn't require any parameter, you can just call it without them:

```javascript
client.User
  .all() // https://my.api.com/users
  .then((response) => console.log(response.data()))
  .catch((response) => console.error(response.data()))
```

Every parameter that doesn't match a pattern `{parameter-name}` in path will be sent as part of the query string:

```javascript
client.User.all({ active: true }) // https://my.api.com/users?active=true
```

When a method requires a parameters and the method is called without it, __Mappersmith__ will raise an error:

```javascript
client.User.byId(/* missing id */)
// throw '[Mappersmith] required parameter missing (id), "/users/{id}" cannot be resolved'
```

You can optionally set `parameterEncoder: yourEncodingFunction` to change the default encoding function for parameters. This is useful when you are calling an endpoint which for example requires not encoded characters like `:` that are otherwise encoded by the default behaviour of the `encodeURIComponent` function ([external documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent?retiredLocale=it#description)).

```javascript
const client = forge({
  host: 'https://custom-host.com',
  parameterEncoder: yourEncodingFunction,
  resources: { ... }
})
```

### <a name="default-parameters"></a> Default Parameters

It is possible to configure default parameters for your resources, just use the key `params` in the definition. It will replace params in the URL or include query strings.

If we call `client.User.byGroup` without any params it will default `group` to "general"

```javascript
client.User.byGroup() // https://my.api.com/users/groups/general
```

And, of course, we can override the defaults:

```javascript
client.User.byGroup({ group: 'cool' }) // https://my.api.com/users/groups/cool
```

### <a name="aliased-parameters"></a> Renaming query parameters

Sometimes the expected format of your query parameters doesn't match that of your codebase. For example, maybe you're using `camelCase` in your code but the API you are calling expects `snake_case`. In that case, set `queryParamAlias` in the definition to an object that describes a mapping between your input parameter and the desired output format.

This mapping will not be applied to params in the URL.

```javascript
client.Blog.all({ subjectId: 10 }) // https://my.api.com/blogs?subject_id=10
```

### <a name="body"></a> Body

To send values in the request body (usually for POST, PUT or PATCH methods) you will use the special parameter `body`:

```javascript
client.Blog.create({
  body: {
    title: 'Title',
    tags: ['party', 'launch']
  }
})
```

By default, it will create a _urlencoded_ version of the object (`title=Title&tags[]=party&tags[]=launch`). If the body used is not an object it will use the original value. If `body` is not possible as a special parameter for your API you can configure it through the param `bodyAttr`:

```javascript
// ...
{
  create: { method: 'post', path: '/blogs', bodyAttr: 'payload' }
}
// ...

client.Blog.create({
  payload: {
    title: 'Title',
    tags: ['party', 'launch']
  }
})
```

__NOTE__: It's possible to post body as JSON, check the [EncodeJsonMiddleware](#middleware-encode-json) below for more information
__NOTE__: The `bodyAttr` param can be set at manifest level.

### <a name="headers"></a> Headers

To define headers in the method call use the parameter `headers`:

```javascript
client.User.all({ headers: { Authorization: 'token 1d1435k' } })
```

If `headers` is not possible as a special parameter for your API you can configure it through the param `headersAttr`:

```javascript
// ...
{
  all: { path: '/users', headersAttr: 'h' }
}
// ...

client.User.all({ h: { Authorization: 'token 1d1435k' } })
```

__NOTE__: The `headersAttr` param can be set at manifest level.

### <a name="basic-auth"></a> Basic auth

To define credentials for basic auth use the parameter `auth`:

```javascript
client.User.all({ auth: { username: 'bob', password: 'bob' } })
```

The available attributes are: `username` and `password`.
This will set an `Authorization` header. This can still be overridden by custom headers.

If `auth` is not possible as a special parameter for your API you can configure it through the param `authAttr`:

```javascript
// ...
{
  all: { path: '/users', authAttr: 'secret' }
}
// ...

client.User.all({ secret: { username: 'bob', password: 'bob' } })
```

__NOTE__: A default basic auth can be configured with the use of the [BasicAuthMiddleware](#middleware-basic-auth), check the middleware section below for more information.
__NOTE__: The `authAttr` param can be set at manifest level.

### <a name="timeout"></a> Timeout

To define the number of milliseconds before the request times out use the parameter `timeout`:

```javascript
client.User.all({ timeout: 1000 })
```

If `timeout` is not possible as a special parameter for your API you can configure it through the param `timeoutAttr`:

```javascript
// ...
{
  all: { path: '/users', timeoutAttr: 'maxWait' }
}
// ...

client.User.all({ maxWait: 500 })
```

__NOTE__: A default timeout can be configured with the use of the [TimeoutMiddleware](#middleware-timeout), check the middleware section below for more information.
__NOTE__: The `timeoutAttr` param can be set at manifest level.

### <a name="abort-signal"></a> Abort Signal

The [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) interface represents a signal object that allows you to communicate with an asynchronous operation (such as a fetch request) and abort it if required via an AbortController object. All gateway APIs (Fetch, HTTP and XHR) support this interface via the `signal` parameter:

```javascript
const abortController = new AbortController()
client.User.all({ signal: abortController.signal })
// abort!
abortController.abort()
```

If `signal` is not possible as a special parameter for your API you can configure it through the param `signalAttr`:

```javascript
// ...
{
  all: { path: '/users', signalAttr: 'abortSignal' }
}
// ...

const abortController = new AbortController()
client.User.all({ abortSignal: abortController.signal })
// abort!
abortController.abort()
```

__NOTE__: The `signalAttr` param can be set at manifest level.

### <a name="alternative-host"></a> Alternative host

There are some cases where a resource method resides in another host, in those cases you can use the `host` key to configure a new host:

```javascript
// ...
{
  all: { path: '/users', host: 'http://old-api.com' }
}
// ...

client.User.all() // http://old-api.com/users
```

In case you need to overwrite the host for a specific call, you can do so through the param `host`:

```javascript
// ...
{
  all: { path: '/users', host: 'http://old-api.com' }
}
// ...

client.User.all({ host: 'http://very-old-api.com' }) // http://very-old-api.com/users
```

If `host` is not possible as a special parameter for your API, you can configure it through the param `hostAttr`:

```javascript
// ...
{
  all: { path: '/users', hostAttr: 'baseUrl' }
}
// ...

client.User.all({ baseUrl: 'http://very-old-api.com' }) // http://very-old-api.com/users
```

**NOTE**: Since version `2.34.0` you need to also use `allowResourceHostOverride: true`, example:

```javascript
const client = forge({
  host: 'https://new-host.com',
  allowResourceHostOverride: true,
  resources: {
    User: {
      all: { path: '/users', host: 'https://old-host.com }
    }
  }
})
```

Whenever using host overrides, be diligent about how you pass parameters to your resource methods. If you spread unverified attributes, you might open your server to SSR attacks.

### <a name="alternative-path"></a> Alternative path

In case you need to overwrite the path for a specific call, you can do so through the param `path`:

```javascript
// ...
{
  all: { path: '/users' }
}
// ...

client.User.all({ path: '/people' })
```

If `path` is not possible as a special parameter for your API, you can configure it through the param `pathAttr`:

```javascript
// ...
{
  all: { path: '/users', pathAttr: '__path' }
}
// ...

client.User.all({ __path: '/people' })
```

### <a name="binary-data"></a> Binary data

If the data being fetched is in binary form, such as a PDF, you may add the `binary` key, and set it to true. The response data will then be a [Buffer](https://nodejs.org/api/buffer.html) in NodeJS, and a [Blob](https://developer.mozilla.org/sv-SE/docs/Web/API/Blob) in the browser.

```javascript

// ...
{
  report: { path: '/report.pdf', binary: true }
}
// ...

```

## <a name="promises"></a> Promises

__Mappersmith__ does not apply any polyfills, it depends on a native Promise implementation to be supported. If your environment doesn't support Promises, please apply the polyfill first. One option can be [then/promises](https://github.com/then/promise)

In some cases it is not possible to use/assign the global `Promise` constant, for those cases you can define the promise implementation used by Mappersmith.

For example, using the project [rsvp.js](https://github.com/tildeio/rsvp.js/) (a tiny implementation of Promises/A+):

```javascript
import RSVP from 'rsvp'
import { configs } from 'mappersmith'

configs.Promise = RSVP.Promise
```

All `Promise` references in Mappersmith use `configs.Promise`. The default value is the global Promise.

## <a name="response-object"></a> Response object

Mappersmith will provide an instance of its own `Response` object to the promises. This object has the methods:

* `request()` - Returns the original [Request](https://github.com/tulios/mappersmith/blob/master/src/request.js)
* `status()` - Returns the status number
* `success()` - Returns true for status greater than 200 and lower than 400
* `headers()` - Returns an object with all headers, keys in lower case
* `header(name)` - Returns the value of the header
* `data()` - Returns the response data, if `Content-Type` is `application/json` it parses the response and returns an object
* `error()` - Returns the last error instance that caused the request to fail or `null`

## <a name="middleware"></a> Middleware

The behavior between your client and the API can be customized with middleware. A middleware is a function which returns an object with two methods: request and response.

### <a name="creating-middleware"></a> Creating middleware

The `prepareRequest` method receives a function which returns a `Promise` resolving the [Request](https://github.com/tulios/mappersmith/blob/master/src/request.js). This function must return a `Promise` resolving the request. The method `enhance` can be used to generate a new request based on the previous one.

```javascript
const MyMiddleware = () => ({
  prepareRequest(next) {
    return next().then(request => request.enhance({
      headers: { 'x-special-request': '->' }
    }))
  }
})
```

If you have multiple middleware it is possible to pass information from an earlier ran middleware to a later one via the request context:

```javascript
const MyMiddlewareOne = () => ({
  async prepareRequest(next) {
    const request = await next().then(request => request.enhance({}, { message: 'hello from mw1' }))
  }
})

const MyMiddlewareTwo = () => ({
  async prepareRequest(next) {
    const request = await next()
    const { message } = request.getContext()
    // Logs: "hello from mw1"
    console.log(message)
    return request
  }
})
```

The above example assumes you synthesized your middleware in this order when calling `forge`: `middleware: [MyMiddlewareOne, MyMiddlewareTwo]`

The `response` method receives a function which returns a `Promise` resolving the [Response](https://github.com/tulios/mappersmith/blob/master/src/response.js). This function must return a `Promise` resolving the Response. The method `enhance` can be used to generate a new response based on the previous one.

```javascript
const MyMiddleware = () => ({
  response(next) {
    return next().then((response) => response.enhance({
      headers: { 'x-special-response': '<-' }
    }))
  }
})
```

#### <a name="context"></a> Context (deprecated)

⚠️ `setContext` is not safe for concurrent use, and shouldn't be used!

Why is it not safe? Basically, the setContext function mutates a global state (see [here](https://github.com/tulios/mappersmith/blob/2.34.0/src/mappersmith.js#L114)), hence it is the last call to setContext that decides its global value. Which leads to a race condition when handling concurrent requests.

#### <a name="creating-middleware-optional-arguments"></a> Optional arguments

It can, optionally, receive `resourceName`, `resourceMethod`, [#context](`context`), `clientId` and `mockRequest`. Example:

```javascript
const MyMiddleware = ({ resourceName, resourceMethod, context, clientId, mockRequest }) => ({
  /* ... */
})

client.User.all()
// resourceName: 'User'
// resourceMethod: 'all'
// clientId: 'myClient'
// context: {}
// mockRequest: false
```

##### <a name="creating-middleware-optional-arguments-mock-request"></a> mockRequest

Before mocked clients can assert whether or not their mock definition matches a request they have to execute their middleware on that request. This means that middleware might be executed multiple times for the same request. More specifically, the middleware will be executed once per mocked client that utilises the middleware until a mocked client with a matching definition is found. If you want to avoid middleware from being called multiple times you can use the optional "mockRequest" boolean flag. The value of this flag will be truthy whenever the middleware is being executed during the mock definition matching phase. Otherwise its value will be falsy. Example:

```javascript
const MyMiddleware = ({ mockRequest }) => {
  prepareRequest(next) {
    if (mockRequest) {
      ... // executed once for each mocked client that utilises the middleware
    }
    if (!mockRequest) {
      ... // executed once for the matching mock definition
    }
    return next().then(request => request)
  }
}
```

##### <a name="creating-middleware-optional-arguments-abort"></a> Abort

The `prepareRequest` phase can optionally receive a function called "abort". This function can be used to abort the middleware execution early-on and throw a custom error to the user. Example:

```javascript
const MyMiddleware = () => {
  prepareRequest(next, abort) {
    return next().then(request =>
      request.header('x-special')
        ? response
        : abort(new Error('"x-special" must be set!'))
    )
  }
}
```

##### <a name="creating-middleware-optional-arguments-renew"></a> Renew

The `response` phase can optionally receive a function called "renew". This function can be used to rerun the middleware stack. This feature is useful in some scenarios, for example, automatically refreshing an expired access token. Example:

```javascript
const AccessTokenMiddleware = () => {
  // maybe this is stored elsewhere, here for simplicity
  let accessToken = null

  return () => ({
    request(request) {
      return Promise
        .resolve(accessToken)
        .then((token) => token || fetchAccessToken())
        .then((token) => {
          accessToken = token
          return request.enhance({
            headers: { 'Authorization': `Token ${token}` }
          })
        })
    },
    response(next, renew) {
      return next().catch(response => {
        if (response.status() === 401) { // token expired
          accessToken = null
          return renew()
        }

        return next()
      })
    }
  })
}
```

Then:

```javascript
const AccessToken = AccessTokenMiddleware()
const client = forge({
  // ...
  middleware: [ AccessToken ],
  // ...
})
```

"renew" can only be invoked sometimes before it's considered an infinite loop, make sure your middleware can distinguish an error from a "renew". By default, mappersmith will allow 2 calls to "renew". This can be configured with `configs.maxMiddlewareStackExecutionAllowed`. It's advised to keep this number low. Example:

```javascript
import { configs } from 'mappersmith'
configs.maxMiddlewareStackExecutionAllowed = 3
```

If an infinite loop is detected, mappersmith will throw an error.

##### <a name="creating-middleware-optional-arguments-request"></a> request

The `response` phase can optionally receive an argument called "request". This argument is the final request (after the whole middleware chain has prepared and all `prepareRequest` been executed). This is useful in some scenarios, for example when you want to get access to the `request` without invoking `next`:

```javascript
const CircuitBreakerMiddleware = () => {
  return () => ({
    response(next, renew, request) {
      // Creating the breaker required some information available only on `request`:
      const breaker = createBreaker({ ..., timeout: request.timeout })
      // Note: `next` is still wrapped:
      return breaker.invoke(createExecutor(next))
    }
  })
}
```

### <a name="configuring-middleware"></a> Configuring middleware

Middleware scope can be Global, Client or on Resource level. The order will be applied in this order: Resource level applies first, then Client level, and finally Global level. The subsections below describes the differences and how to use them correctly.

#### <a name="resource-middleware"></a> Resource level middleware

Resource middleware are configured using the key `middleware` in the resource level of manifest, example:

```javascript
const client = forge({
  clientId: 'myClient',
  resources: {
    User: {
      all: {
        // only the `all` resource will include MyMiddleware:
        middleware: [ MyMiddleware ],
        path: '/users'
      }
    }
  }
})
```

#### <a name="client-middleware"></a> Client level middleware

Client middleware are configured using the key `middleware` in the root level of manifest, example:

```javascript
const client = forge({
  clientId: 'myClient',
  // all resources in this client will include MyMiddleware:
  middleware: [ MyMiddleware ],
  resources: {
    User: {
      all: { path: '/users' }
    }
  }
})
```

#### <a name="global-middleware"></a> Global middleware

Global middleware are configured on a config level, and all new clients will automatically
include the defined middleware, example:

```javascript
import { forge, configs } from 'mappersmith'

configs.middleware = [MyMiddleware]
// all clients defined from now on will include MyMiddleware
```

* Global middleware can be disabled for specific clients with the option `ignoreGlobalMiddleware`, e.g:

```javascript
forge({
  ignoreGlobalMiddleware: true,
  // + the usual configurations
})
```

### <a name="built-in-middleware"></a> Built-in middleware

#### <a name="middleware-basic-auth"></a> BasicAuth

Automatically configure your requests with basic auth

```javascript
import { BasicAuthMiddleware } from 'mappersmith/middleware'
const BasicAuth = BasicAuthMiddleware({ username: 'bob', password: 'bob' })

const client = forge({
  middleware: [ BasicAuth ],
  /* ... */
})

client.User.all()
// => header: "Authorization: Basic Ym9iOmJvYg=="
```

** The default auth can be overridden with the explicit use of the auth parameter, example:

```javascript
client.User.all({ auth: { username: 'bill', password: 'bill' } })
// auth will be { username: 'bill', password: 'bill' } instead of { username: 'bob', password: 'bob' }
```

#### <a name="middleware-csrf"></a> CSRF

Automatically configure your requests by adding a header with the value of a cookie - If it exists.
The name of the cookie (defaults to "csrfToken") and the header (defaults to "x-csrf-token") can be set as following;

```javascript
import { CsrfMiddleware } from 'mappersmith/middleware'

const client = forge({
  middleware: [ CsrfMiddleware('csrfToken', 'x-csrf-token') ],
  /* ... */
})

client.User.all()
```

#### <a name="middleware-duration"></a> Duration

Automatically adds `X-Started-At`, `X-Ended-At` and `X-Duration` headers to the response.

```javascript
import { DurationMiddleware } from 'mappersmith/middleware'

const client = forge({
  middleware: [ DurationMiddleware ],
  /* ... */
})

client.User.all({ body: { name: 'bob' } })
// => headers: "X-Started-At=1492529128453;X-Ended-At=1492529128473;X-Duration=20"
```

#### <a name="middleware-encode-json"></a> EncodeJson

Automatically encode your objects into JSON

```javascript
import { EncodeJsonMiddleware } from 'mappersmith/middleware'

const client = forge({
  middleware: [ EncodeJsonMiddleware ],
  /* ... */
})

client.User.all({ body: { name: 'bob' } })
// => body: {"name":"bob"}
// => header: "Content-Type=application/json;charset=utf-8"
```

#### <a name="middleware-global-error-handler"></a> GlobalErrorHandler

Provides a catch-all function for all requests. If the catch-all function returns `true` it prevents the original promise to continue.

```javascript
import { GlobalErrorHandlerMiddleware, setErrorHandler } from 'mappersmith/middleware'

setErrorHandler((response) => {
  console.log('global error handler')
  return response.status() === 500
})

const client = forge({
  middleware: [ GlobalErrorHandlerMiddleware ],
  /* ... */
})

client.User
  .all()
  .catch((response) => console.error('my error'))

// If status != 500
// output:
//   -> global error handler
//   -> my error

// IF status == 500
// output:
//   -> global error handler
```

#### <a name="middleware-log"></a> Log

Log all requests and responses. Might be useful in development mode.

```javascript
import { LogMiddleware } from 'mappersmith/middleware'

const client = forge({
  middleware: [ LogMiddleware ],
  /* ... */
})
```

#### <a name="middleware-retry"></a> Retry

This middleware will automatically retry GET requests up to the configured amount of retries using a randomization function that grows exponentially. The retry count and the time used will be included as a header in the response. By default on requests with response statuses >= 500 will be retried.

It's possible to configure the header names and parameters used in the calculation by providing a configuration object when creating the middleware.

If no configuration is passed when creating the middleware then the defaults will be used.

```javascript
import { RetryMiddleware } from 'mappersmith/middleware'

const retryConfigs = {
  headerRetryCount: 'X-Mappersmith-Retry-Count',
  headerRetryTime: 'X-Mappersmith-Retry-Time',
  maxRetryTimeInSecs: 5,
  initialRetryTimeInSecs: 0.1,
  factor: 0.2, // randomization factor
  multiplier: 2, // exponential factor
  retries: 5, // max retries
  validateRetry: (response) => response.responseStatus >= 500 // a function that returns true if the request should be retried
}

const client = forge({
  middleware: [ Retry(retryConfigs) ],
  /* ... */
})
```

#### <a name="middleware-timeout"></a> Timeout

Automatically configure your requests with a default timeout

```javascript
import { TimeoutMiddleware } from 'mappersmith/middleware'
const Timeout = TimeoutMiddleware(500)

const client = forge({
  middleware: [ Timeout ],
  /* ... */
})

client.User.all()
```

** The default timeout can be overridden with the explicit use of the timeout parameter, example:

```javascript
client.User.all({ timeout: 100 })
// timeout will be 100 instead of 500
```

### <a name="middleware-legacy-notes"></a> Middleware legacy notes

This section is only relevant for mappersmith versions older than but not including `2.27.0`, when the method `prepareRequest` did not exist. This section describes how to create a middleware using older versions.

Since version `2.27.0` a new method was introduced: `prepareRequest`. This method aims to replace the `request` method in future versions of mappersmith, it has a similar signature as the `response` method and it is always async. All previous middleware are backward compatible, the default implementation of `prepareRequest` will call the `request` method if it exists.

The `request` method receives an instance of the [Request](https://github.com/tulios/mappersmith/blob/master/src/request.js) object and it must return a Request. The method `enhance` can be used to generate a new request based on the previous one.

Example:

```javascript
const MyMiddleware = () => ({
  request(request) {
    return request.enhance({
      headers: { 'x-special-request': '->' }
    })
  },

  response(next) {
    return next().then((response) => response.enhance({
      headers: { 'x-special-response': '<-' }
    }))
  }
})
```

The request phase can be asynchronous, just return a promise resolving a request. Example:

```javascript
const MyMiddleware = () => ({
  request(request) {
    return Promise.resolve(
      request.enhance({
        headers: { 'x-special-token': 'abc123' }
      })
    )
  }
})
```

## <a name="testing-mappersmith"></a> Testing Mappersmith

Mappersmith plays nice with all test frameworks, the generated client is a plain javascript object and all the methods can be mocked without any problem. However, this experience can be greatly improved with the test library.

The test library has 4 utilities: `install`, `uninstall`, `mockClient` and `mockRequest`

#### install and uninstall

They are used to setup the test library, __example using jasmine__:

```javascript
import { install, uninstall } from 'mappersmith/test'

describe('Feature', () => {
  beforeEach(() => install())
  afterEach(() => uninstall())
})
```

#### mockClient

`mockClient` offers a high level abstraction, it works directly on your client mocking the resources and their methods.

It accepts the methods:

* `resource(resourceName)`, ex: `resource('Users')`
* `method(resourceMethodName)`, ex: `method('byId')`
* `with(resourceMethodArguments)`, ex: `with({ id: 1 })`
* `status(statusNumber | statusHandler)`, ex: `status(204)` or `status((request, mock) => 200)`
* `headers(responseHeaders)`, ex: `headers({ 'x-header': 'value' })`
* `response(responseData | responseHandler)`, ex: `response({ user: { id: 1 } })` or `response((request, mock) => ({ user: { id: request.body().id } }))`
* `assertObject()`
* `assertObjectAsync()`

Example using __jasmine__:

```javascript
import { forge } from 'mappersmith'
import { install, uninstall, mockClient } from 'mappersmith/test'

describe('Feature', () => {
  beforeEach(() => install())
  afterEach(() => uninstall())

  it('works', (done) => {
    const myManifest = {} // Let's assume I have my manifest here
    const client = forge(myManifest)

    mockClient(client)
      .resource('User')
      .method('all')
      .response({ allUsers: [{id: 1}] })

    // now if I call my resource method, it should return my mock response
    client.User
      .all()
      .then((response) => expect(response.data()).toEqual({ allUsers: [{id: 1}] }))
      .then(done)
  })
})
```

To mock a failure just use the correct HTTP status, example:

```javascript
// ...
mockClient(client)
  .resource('User')
  .method('byId')
  .with({ id: 'ABC' })
  .status(422)
  .response({ error: 'invalid ID' })
// ...
```

The method `with` accepts the body and headers attributes, example:

```javascript
// ...
mockClient(client)
  .with({
    id: 'abc',
    headers: { 'x-special': 'value'},
    body: { payload: 1 }
  })
  // ...
```

It's possible to use a match function to assert params and body, example:

```javascript
import { m } from 'mappersmith/test'

mockClient(client)
  .with({
    id: 'abc',
    name: m.stringContaining('john'),
    headers: { 'x-special': 'value'},
    body: m.stringMatching(/token=[^&]+&other=true$/)
  })
```

The assert object can be used to retrieve the requests that went through the created mock, example:

```javascript
const mock = mockClient(client)
  .resource('User')
  .method('all')
  .response({ allUsers: [{id: 1}] })
  .assertObject()

console.log(mock.mostRecentCall())
console.log(mock.callsCount())
console.log(mock.calls())
```

The `mock` object is an instance of `MockAssert` and exposes three methods:
  - _calls()_: returns a `Request` array;
  - _mostRecentCall()_: returns the last Request made. Returns `null` if array is empty.
  - _callsCount()_: returns the number of requests that were made through the mocked client;

__Note__:
The assert object will also be returned in the `mockRequest` function call.


If you have a middleware with an async request phase use `assertObjectAsync` to await for the middleware execution, example:

```javascript
const mock = await mockClient(client)
  .resource('User')
  .method('all')
  .response({ allUsers: [{id: 1}] })
  .assertObjectAsync()

console.log(mock.mostRecentCall())
console.log(mock.callsCount())
console.log(mock.calls())
```

`response` and `status` can accept functions to generate response body or status. This can be useful when you want to return different responses for the same request being made several times.

```javascript
const generateResponse = () => {
  return (request, mock) => mock.callsCount() === 0
    ? {}
    : { user: { id: 1 } }
}

const mock = mockClient(client)
  .resource('User')
  .method('create')
  .response(generateResponse())
```

#### mockRequest

`mockRequest` offers a low level abstraction, very useful for automations.

It accepts the params: method, url, body and response

It returns an assert object

Example using __jasmine__:

```javascript
import { forge } from 'mappersmith'
import { install, uninstall, mockRequest } from 'mappersmith/test'

describe('Feature', () => {
  beforeEach(() => install())
  afterEach(() => uninstall())

  it('works', (done) => {
    mockRequest({
      method: 'get',
      url: 'https://my.api.com/users?someParam=true',
      response: {
        body: { allUsers: [{id: 1}] }
      }
    })

    const myManifest = {} // Let's assume I have my manifest here
    const client = forge(myManifest)

    client.User
      .all()
      .then((response) => expect(response.data()).toEqual({ allUsers: [{id: 1}] }))
      .then(done)
  })
})
```

A more complete example:

```javascript
// ...
mockRequest({
  method: 'post',
  url: 'http://example.org/blogs',
  body: 'param1=A&param2=B', // request body
  response: {
    status: 503,
    body: { error: true },
    headers: { 'x-header': 'nope' }
  }
})
// ...
```

It's possible to use a match function to assert the body and the URL, example:

```javascript
import { m } from 'mappersmith/test'

mockRequest({
  method: 'post',
  url: m.stringMatching(/example\.org/),
  body: m.anything(),
  response: {
    body: { allUsers: [{id: 1}] }
  }
})
```

Using the assert object:

```javascript
const mock = mockRequest({
  method: 'get',
  url: 'https://my.api.com/users?someParam=true',
  response: {
    body: { allUsers: [{id: 1}] }
  }
})

console.log(mock.mostRecentCall())
console.log(mock.callsCount())
console.log(mock.calls())
```

#### Match functions

`mockClient` and `mockRequest` accept match functions, the available built-in match functions are:

```javascript
import { m } from 'mappersmith/test'

m.stringMatching(/something/) // accepts a regexp
m.stringContaining('some-string') // accepts a string
m.anything()
m.uuid4()
```

A match function is a function which returns a boolean, example:

```javascript
mockClient(client)
  .with({
    id: 'abc',
    headers: { 'x-special': 'value'},
    body: (body) => body === 'something'
  })
```

__Note__:
`mockClient` only accepts match functions for __body__ and __params__
`mockRequest` only accepts match functions for __body__ and __url__

#### unusedMocks

`unusedMocks` can be used to check if there are any unused mocks after each test. It
will return count of unused mocks. It can be either unused `mockRequest` or `mockClient`.

```javascript
import { install, uninstall, unusedMocks } from 'mappersmith/test'

describe('Feature', () => {
  beforeEach(() => install())
  afterEach(() => {
    const unusedMocksCount = unusedMocks()
    uninstall()
    if (unusedMocksCount > 0) {
      throw new Error(`There are ${unusedMocksCount} unused mocks`) // fail the test
    }
  })
})
```

## <a name="gateways"></a> Gateways

Mappersmith has a pluggable transport layer and it includes by default three gateways: xhr, http and fetch. Mappersmith will pick the correct gateway based on the environment you are running (nodejs, service worker or the browser).

You can write your own gateway, take a look at [XHR](https://github.com/tulios/mappersmith/blob/master/src/gateway/xhr.js) for an example. To configure, import the `configs` object and assign the gateway option, like:

```javascript
import { configs } from 'mappersmith'
configs.gateway = MyGateway
```

It's possible to globally configure your gateway through the option `gatewayConfigs`.

### HTTP

When running with node.js you can configure the `configure` callback to further customize the `http/https` module, example:

```javascript
import fs from 'fs'
import https from 'https'
import { configs } from 'mappersmith'

const key = fs.readFileSync('/path/to/my-key.pem')
const cert =  fs.readFileSync('/path/to/my-cert.pem')

configs.gatewayConfigs.HTTP = {
  configure() {
    return {
      agent: new https.Agent({ key, cert })
    }
  }
}
```

The new configurations will be merged. `configure` also receives the `requestParams` as the first argument. Take a look [here](https://github.com/tulios/mappersmith/blob/master/src/mappersmith.js) for more options.

The HTTP gatewayConfigs also provides several callback functions that will be called when various events are emitted on the `request`, `socket`, and `response` EventEmitters. These callbacks can be used as a hook into the event cycle to execute any custom code.
For example, you may want to time how long each stage of the request or response takes.
These callback functions will receive the `requestParams` as the first argument.

The following callbacks are supported:
* `onRequestWillStart` - This callback is not based on a event emitted by Node but is called just before the `request` method is called.
* `onRequestSocketAssigned` - Called when the 'socket' event is emitted on the `request`
* `onSocketLookup` - Called when the `lookup` event is emitted on the `socket`
* `onSocketConnect` - Called when the `connect` event is emitted on the `socket`
* `onSocketSecureConnect` - Called when the `secureConnect` event is emitted on the `socket`
* `onResponseReadable` - Called when the `readable` event is emitted on the `response`
* `onResponseEnd` - Called when the `end` event is emitted on the `response`

```javascript
let startTime

configs.gatewayConfigs.HTTP = {
  onRequestWillStart() {
    startTime = Date.now()
  }
  onResponseReadable() {
    console.log('Time to first byte', Date.now() - startTime)
  }
}
```

### XHR

When running in the browser you can configure `withCredentials` and `configure` to further customize the `XMLHttpRequest` object, example:

```javascript
import { configs } from 'mappersmith'
configs.gatewayConfigs.XHR = {
  withCredentials: true,
  configure(xhr) {
    xhr.ontimeout = () => console.error('timeout!')
  }
}
```

Take a look [here](https://github.com/tulios/mappersmith/blob/master/src/mappersmith.js) for more options.

### Fetch

__Mappersmith__ does not apply any polyfills, it depends on a native `fetch` implementation to be supported. It is possible to assign the fetch implementation used by Mappersmith:

```javascript
import { configs } from 'mappersmith'
configs.fetch = fetchFunction
```

Fetch is not used by default, you can configure it through `configs.gateway`.

```javascript
import { FetchGateway } from 'mappersmith/gateway'
import { configs } from 'mappersmith'

configs.gateway = FetchGateway

// Extra configurations, if needed
configs.gatewayConfigs.Fetch = {
  credentials: 'same-origin'
}
```

Take a look [here](https://github.com/tulios/mappersmith/blob/master/src/mappersmith.js) for more options.

### <a name="typescript"></a> TypeScript

__Mappersmith__ also supports TypeScript (>=3.5). In the following sections there are some common examples for using TypeScript with Mappersmith where it is not too obvious how typings are properly applied.

#### Create a middleware with TypeScript

To create a middleware using TypeScript you just have to add the `Middleware` interface to your middleware object:

```typescript
import type { Middleware } from 'mappersmith'

const MyMiddleware: Middleware = () => ({
  prepareRequest(next) {
    return next().then(request => request.enhance({
      headers: { 'x-special-request': '->' }
    }))
  },

  response(next) {
    return next().then(response => response.enhance({
      headers: { 'x-special-response': '<-' }
    }))
  }
})
```

#### Use `mockClient` with TypeScript

To use the `mockClient` with proper types you need to pass a typeof your client as generic to the `mockClient` function:

```typescript
import { forge } from 'mappersmith'
import { mockClient } from 'mappersmith/test'

const github = forge({
  clientId: 'github',
  host: 'https://status.github.com',
  resources: {
    Status: {
      current: { path: '/api/status.json' },
      messages: { path: '/api/messages.json' },
      lastMessage: { path: '/api/last-message.json' },
    },
  },
})

const mock = mockClient<typeof github>(github)
  .resource('Status')
  .method('current')
  .with({ id: 'abc' })
  .response({ allUsers: [] })
  .assertObject()

console.log(mock.mostRecentCall())
console.log(mock.callsCount())
console.log(mock.calls())
```

#### Use `mockRequest` with Typescript

```typescript
const mock = mockRequest({
  method: 'get',
  url: 'https://status.github.com/api/status.json',
  response: {
    status: 503,
    body: { error: true },
  }
})

console.log(mock.mostRecentCall())
console.log(mock.callsCount())
console.log(mock.calls())
```

## <a name="development"></a> Development

### Node version

This project uses [ASDF](https://asdf-vm.com/) to manage the node version used via `.tool-versions`.

### Running unit tests:

```sh
yarn test:browser
yarn test:node
```

### Running integration tests:

```sh
yarn integration-server &
yarn test:browser:integration
yarn test:node:integration
```

### Running all tests

```sh
yarn test
```

## Package and release

### Package project only

Useful for testing a branch against local projects. Run the build step, and yarn link to the `dist/` folder:

```sh
yarn publish:prepare
```

In remote project:
```sh
yarn link ../mappersmith/dist
```

### Release

1. Create a release branch, e.g. `git checkout -b release/2.43.0`
2. Update package version and generate an updated `CHANGELOG.md`:

```sh
yarn changeset version
yarn copy:version:src
```

3. Merge the PR.
4. From `master`: pull the latest changes, and build the `dist/` folder which will be published to npm:

```sh
yarn publish:prepare
```

5. Verify the release works. If you are using `npm pack` to create a local tarball, delete this file after the verification has been done.
6. Finally, publish the contents of `dist/` folder to npm:

```sh
cd dist/
rm *.tgz # do not accidentally publish any tarball
npm publish
```

7. Tag the release and push the tags.

```sh
git tag 2.43.0
git push --tags
```

## Linting

This project uses prettier and eslint, it is recommended to install extensions in your editor to format on save.

## Contributors

Check it out!

https://github.com/tulios/mappersmith/graphs/contributors

## License

See [LICENSE](https://github.com/tulios/mappersmith/blob/master/LICENSE) for more details.
