# http-proxy-middleware

[![GitHub Workflow Status (with branch)](https://img.shields.io/github/actions/workflow/status/chimurai/http-proxy-middleware/ci.yml?branch=master&logo=github-actions&logoColor=white&style=flat-square)](https://github.com/chimurai/http-proxy-middleware/actions/workflows/ci.yml?query=branch%3Amaster)
[![Coveralls](https://img.shields.io/coveralls/chimurai/http-proxy-middleware.svg?style=flat-square&logo=coveralls)](https://coveralls.io/r/chimurai/http-proxy-middleware)
[![Known Vulnerabilities](https://snyk.io/test/github/chimurai/http-proxy-middleware/badge.svg)](https://snyk.io/test/github/chimurai/http-proxy-middleware)
[![npm](https://img.shields.io/npm/v/http-proxy-middleware?color=%23CC3534&style=flat-square&logo=npm)](https://www.npmjs.com/package/http-proxy-middleware)

Node.js proxying made simple. Configure proxy middleware with ease for [connect](https://github.com/senchalabs/connect), [express](https://github.com/expressjs/express), [next.js](https://github.com/vercel/next.js) and [many more](#compatible-servers).

Powered by the popular Nodejitsu [`http-proxy`](https://github.com/http-party/node-http-proxy). [![GitHub stars](https://img.shields.io/github/stars/http-party/node-http-proxy.svg?style=social&label=Star)](https://github.com/http-party/node-http-proxy)

## ⚠️ Note <!-- omit in toc -->

This page is showing documentation for version v3.x.x ([release notes](https://github.com/chimurai/http-proxy-middleware/releases))

See [MIGRATION.md](https://github.com/chimurai/http-proxy-middleware/blob/master/MIGRATION.md) for details on how to migrate from v2.x.x to v3.x.x

If you're looking for older documentation. Go to:

- <https://github.com/chimurai/http-proxy-middleware/tree/v2.0.4#readme>
- <https://github.com/chimurai/http-proxy-middleware/tree/v0.21.0#readme>

## TL;DR <!-- omit in toc -->

Proxy `/api` requests to `http://www.example.org`

:bulb: **Tip:** Set the option `changeOrigin` to `true` for [name-based virtual hosted sites](http://en.wikipedia.org/wiki/Virtual_hosting#Name-based).

```typescript
// typescript

import * as express from 'express';
import type { Request, Response, NextFunction } from 'express';

import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Filter, Options, RequestHandler } from 'http-proxy-middleware';

const app = express();

const proxyMiddleware = createProxyMiddleware<Request, Response>({
  target: 'http://www.example.org/api',
  changeOrigin: true,
});

app.use('/api', proxyMiddleware);

app.listen(3000);

// proxy and keep the same base path "/api"
// http://127.0.0.1:3000/api/foo/bar -> http://www.example.org/api/foo/bar
```

_All_ `http-proxy` [options](https://github.com/nodejitsu/node-http-proxy#options) can be used, along with some extra `http-proxy-middleware` [options](#options).

## Table of Contents <!-- omit in toc -->

<!-- // spell-checker:disable -->

- [Install](#install)
- [Basic usage](#basic-usage)
- [Express Server Example](#express-server-example)
  - [app.use(path, proxy)](#appusepath-proxy)
- [Options](#options)
  - [`pathFilter` (string, \[\]string, glob, \[\]glob, function)](#pathfilter-string-string-glob-glob-function)
  - [`pathRewrite` (object/function)](#pathrewrite-objectfunction)
  - [`router` (object/function)](#router-objectfunction)
  - [`plugins` (Array)](#plugins-array)
  - [`ejectPlugins` (boolean) default: `false`](#ejectplugins-boolean-default-false)
  - [`logger` (Object)](#logger-object)
- [`http-proxy` events](#http-proxy-events)
- [`http-proxy` options](#http-proxy-options)
- [WebSocket](#websocket)
  - [External WebSocket upgrade](#external-websocket-upgrade)
- [Intercept and manipulate requests](#intercept-and-manipulate-requests)
- [Intercept and manipulate responses](#intercept-and-manipulate-responses)
- [Node.js 17+: ECONNREFUSED issue with IPv6 and localhost (#705)](#nodejs-17-econnrefused-issue-with-ipv6-and-localhost-705)
- [Debugging](#debugging)
- [Working examples](#working-examples)
- [Recipes](#recipes)
- [Compatible servers](#compatible-servers)
- [Tests](#tests)
- [Changelog](#changelog)
- [License](#license)

<!-- // spell-checker:enable -->

## Install

```shell
npm install --save-dev http-proxy-middleware
```

## Basic usage

Create and configure a proxy middleware with: `createProxyMiddleware(config)`.

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

const apiProxy = createProxyMiddleware({
  target: 'http://www.example.org',
  changeOrigin: true,
});

// 'apiProxy' is now ready to be used as middleware in a server.
```

- **options.target**: target host to proxy to. _(protocol + host)_
- **options.changeOrigin**: for virtual hosted sites

- see full list of [`http-proxy-middleware` configuration options](#options)

## Express Server Example

An example with `express` server.

```javascript
// include dependencies
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// create the proxy
/** @type {import('http-proxy-middleware/dist/types').RequestHandler<express.Request, express.Response>} */
const exampleProxy = createProxyMiddleware({
  target: 'http://www.example.org/api', // target host with the same base path
  changeOrigin: true, // needed for virtual hosted sites
});

// mount `exampleProxy` in web server
app.use('/api', exampleProxy);
app.listen(3000);
```

### app.use(path, proxy)

If you want to use the server's `app.use` `path` parameter to match requests.
Use `pathFilter` option to further include/exclude requests which you want to proxy.

```javascript
app.use(
  createProxyMiddleware({
    target: 'http://www.example.org/api',
    changeOrigin: true,
    pathFilter: '/api/proxy-only-this-path',
  }),
);
```

`app.use` documentation:

- express: <http://expressjs.com/en/4x/api.html#app.use>
- connect: <https://github.com/senchalabs/connect#mount-middleware>
- polka: <https://github.com/lukeed/polka#usebase-fn>

## Options

http-proxy-middleware options:

### `pathFilter` (string, []string, glob, []glob, function)

Narrow down which requests should be proxied. The `path` used for filtering is the `request.url` pathname. In Express, this is the `path` relative to the mount-point of the proxy.

- **path matching**

  - `createProxyMiddleware({...})` - matches any path, all requests will be proxied when `pathFilter` is not configured.
  - `createProxyMiddleware({ pathFilter: '/api', ...})` - matches paths starting with `/api`

- **multiple path matching**

  - `createProxyMiddleware({ pathFilter: ['/api', '/ajax', '/someotherpath'], ...})`

- **wildcard path matching**

  For fine-grained control you can use wildcard matching. Glob pattern matching is done by _micromatch_. Visit [micromatch](https://www.npmjs.com/package/micromatch) or [glob](https://www.npmjs.com/package/glob) for more globbing examples.

  - `createProxyMiddleware({ pathFilter: '**', ...})` matches any path, all requests will be proxied.
  - `createProxyMiddleware({ pathFilter: '**/*.html', ...})` matches any path which ends with `.html`
  - `createProxyMiddleware({ pathFilter: '/*.html', ...})` matches paths directly under path-absolute
  - `createProxyMiddleware({ pathFilter: '/api/**/*.html', ...})` matches requests ending with `.html` in the path of `/api`
  - `createProxyMiddleware({ pathFilter: ['/api/**', '/ajax/**'], ...})` combine multiple patterns
  - `createProxyMiddleware({ pathFilter: ['/api/**', '!**/bad.json'], ...})` exclusion

  **Note**: In multiple path matching, you cannot use string paths and wildcard paths together.

- **custom matching**

  For full control you can provide a custom function to determine which requests should be proxied or not.

  ```javascript
  /**
   * @return {Boolean}
   */
  const pathFilter = function (path, req) {
    return path.match('^/api') && req.method === 'GET';
  };

  const apiProxy = createProxyMiddleware({
    target: 'http://www.example.org',
    pathFilter: pathFilter,
  });
  ```

### `pathRewrite` (object/function)

Rewrite target's url path. Object-keys will be used as _RegExp_ to match paths.

```javascript
// rewrite path
pathRewrite: {'^/old/api' : '/new/api'}

// remove path
pathRewrite: {'^/remove/api' : ''}

// add base path
pathRewrite: {'^/' : '/basepath/'}

// custom rewriting
pathRewrite: function (path, req) { return path.replace('/api', '/base/api') }

// custom rewriting, returning Promise
pathRewrite: async function (path, req) {
  const should_add_something = await httpRequestToDecideSomething(path);
  if (should_add_something) path += "something";
  return path;
}
```

### `router` (object/function)

Re-target `option.target` for specific requests.

```javascript
// Use `host` and/or `path` to match requests. First match will be used.
// The order of the configuration matters.
router: {
    'integration.localhost:3000' : 'http://127.0.0.1:8001',  // host only
    'staging.localhost:3000'     : 'http://127.0.0.1:8002',  // host only
    'localhost:3000/api'         : 'http://127.0.0.1:8003',  // host + path
    '/rest'                      : 'http://127.0.0.1:8004'   // path only
}

// Custom router function (string target)
router: function(req) {
    return 'http://127.0.0.1:8004';
}

// Custom router function (target object)
router: function(req) {
    return {
        protocol: 'https:', // The : is required
        host: '127.0.0.1',
        port: 8004
    };
}

// Asynchronous router function which returns promise
router: async function(req) {
    const url = await doSomeIO();
    return url;
}
```

### `plugins` (Array)

```js
const simpleRequestLogger = (proxyServer, options) => {
  proxyServer.on('proxyReq', (proxyReq, req, res) => {
    console.log(`[HPM] [${req.method}] ${req.url}`); // outputs: [HPM] GET /users
  });
},

const config = {
  target: `http://example.org`,
  changeOrigin: true,
  plugins: [simpleRequestLogger],
};
```

### `ejectPlugins` (boolean) default: `false`

If you're not satisfied with the pre-configured plugins, you can eject them by configuring `ejectPlugins: true`.

NOTE: register your own error handlers to prevent server from crashing.

```js
// eject default plugins and manually add them back

const {
  debugProxyErrorsPlugin, // subscribe to proxy errors to prevent server from crashing
  loggerPlugin, // log proxy events to a logger (ie. console)
  errorResponsePlugin, // return 5xx response on proxy error
  proxyEventsPlugin, // implements the "on:" option
} = require('http-proxy-middleware');

createProxyMiddleware({
  target: `http://example.org`,
  changeOrigin: true,
  ejectPlugins: true,
  plugins: [debugProxyErrorsPlugin, loggerPlugin, errorResponsePlugin, proxyEventsPlugin],
});
```

### `logger` (Object)

Configure a logger to output information from http-proxy-middleware: ie. `console`, `winston`, `pino`, `bunyan`, `log4js`, etc...

Only `info`, `warn`, `error` are used internally for compatibility across different loggers.

If you use `winston`, make sure to enable interpolation: <https://github.com/winstonjs/winston#string-interpolation>

See also logger recipes ([recipes/logger.md](https://github.com/chimurai/http-proxy-middleware/blob/master/recipes/logger.md)) for more details.

```javascript
createProxyMiddleware({
  logger: console,
});
```

## `http-proxy` events

Subscribe to [http-proxy events](https://github.com/nodejitsu/node-http-proxy#listening-for-proxy-events) with the `on` option:

```js
createProxyMiddleware({
  target: 'http://www.example.org',
  on: {
    proxyReq: (proxyReq, req, res) => {
      /* handle proxyReq */
    },
    proxyRes: (proxyRes, req, res) => {
      /* handle proxyRes */
    },
    error: (err, req, res) => {
      /* handle error */
    },
  },
});
```

- **option.on.error**: function, subscribe to http-proxy's `error` event for custom error handling.

  ```javascript
  function onError(err, req, res, target) {
    res.writeHead(500, {
      'Content-Type': 'text/plain',
    });
    res.end('Something went wrong. And we are reporting a custom error message.');
  }
  ```

- **option.on.proxyRes**: function, subscribe to http-proxy's `proxyRes` event.

  ```javascript
  function onProxyRes(proxyRes, req, res) {
    proxyRes.headers['x-added'] = 'foobar'; // add new header to response
    delete proxyRes.headers['x-removed']; // remove header from response
  }
  ```

- **option.on.proxyReq**: function, subscribe to http-proxy's `proxyReq` event.

  ```javascript
  function onProxyReq(proxyReq, req, res) {
    // add custom header to request
    proxyReq.setHeader('x-added', 'foobar');
    // or log the req
  }
  ```

- **option.on.proxyReqWs**: function, subscribe to http-proxy's `proxyReqWs` event.

  ```javascript
  function onProxyReqWs(proxyReq, req, socket, options, head) {
    // add custom header
    proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
  }
  ```

- **option.on.open**: function, subscribe to http-proxy's `open` event.

  ```javascript
  function onOpen(proxySocket) {
    // listen for messages coming FROM the target here
    proxySocket.on('data', hybridParseAndLogMessage);
  }
  ```

- **option.on.close**: function, subscribe to http-proxy's `close` event.

  ```javascript
  function onClose(res, socket, head) {
    // view disconnected websocket connections
    console.log('Client disconnected');
  }
  ```

## `http-proxy` options

The following options are provided by the underlying [http-proxy](https://github.com/nodejitsu/node-http-proxy#options) library.

- **option.target**: url string to be parsed with the url module
- **option.forward**: url string to be parsed with the url module
- **option.agent**: object to be passed to http(s).request (see Node's [https agent](http://nodejs.org/api/https.html#https_class_https_agent) and [http agent](http://nodejs.org/api/http.html#http_class_http_agent) objects)
- **option.ssl**: object to be passed to https.createServer()
- **option.ws**: true/false: if you want to proxy websockets
- **option.xfwd**: true/false, adds x-forward headers
- **option.secure**: true/false, if you want to verify the SSL Certs
- **option.toProxy**: true/false, passes the absolute URL as the `path` (useful for proxying to proxies)
- **option.prependPath**: true/false, Default: true - specify whether you want to prepend the target's path to the proxy path
- **option.ignorePath**: true/false, Default: false - specify whether you want to ignore the proxy path of the incoming request (note: you will have to append / manually if required).
- **option.localAddress** : Local interface string to bind for outgoing connections
- **option.changeOrigin**: true/false, Default: false - changes the origin of the host header to the target URL
- **option.preserveHeaderKeyCase**: true/false, Default: false - specify whether you want to keep letter case of response header key
- **option.auth** : Basic authentication i.e. 'user:password' to compute an Authorization header.
- **option.hostRewrite**: rewrites the location hostname on (301/302/307/308) redirects.
- **option.autoRewrite**: rewrites the location host/port on (301/302/307/308) redirects based on requested host/port. Default: false.
- **option.protocolRewrite**: rewrites the location protocol on (301/302/307/308) redirects to 'http' or 'https'. Default: null.
- **option.cookieDomainRewrite**: rewrites domain of `set-cookie` headers. Possible values:

  - `false` (default): disable cookie rewriting
  - String: new domain, for example `cookieDomainRewrite: "new.domain"`. To remove the domain, use `cookieDomainRewrite: ""`.
  - Object: mapping of domains to new domains, use `"*"` to match all domains.  
    For example keep one domain unchanged, rewrite one domain and remove other domains:

    ```json
    cookieDomainRewrite: {
      "unchanged.domain": "unchanged.domain",
      "old.domain": "new.domain",
      "*": ""
    }
    ```

- **option.cookiePathRewrite**: rewrites path of `set-cookie` headers. Possible values:

  - `false` (default): disable cookie rewriting
  - String: new path, for example `cookiePathRewrite: "/newPath/"`. To remove the path, use `cookiePathRewrite: ""`. To set path to root use `cookiePathRewrite: "/"`.
  - Object: mapping of paths to new paths, use `"*"` to match all paths.
    For example, to keep one path unchanged, rewrite one path and remove other paths:

    ```json
    cookiePathRewrite: {
      "/unchanged.path/": "/unchanged.path/",
      "/old.path/": "/new.path/",
      "*": ""
    }
    ```

- **option.headers**: object, adds [request headers](https://en.wikipedia.org/wiki/List_of_HTTP_header_fields#Request_fields). (Example: `{host:'www.example.org'}`)
- **option.proxyTimeout**: timeout (in millis) when proxy receives no response from target
- **option.timeout**: timeout (in millis) for incoming requests
- **option.followRedirects**: true/false, Default: false - specify whether you want to follow redirects
- **option.selfHandleResponse** true/false, if set to true, none of the webOutgoing passes are called and it's your responsibility to appropriately return the response by listening and acting on the `proxyRes` event
- **option.buffer**: stream of data to send as the request body. Maybe you have some middleware that consumes the request stream before proxying it on e.g. If you read the body of a request into a field called 'req.rawbody' you could restream this field in the buffer option:

  ```javascript
  'use strict';

  const streamify = require('stream-array');
  const HttpProxy = require('http-proxy');
  const proxy = new HttpProxy();

  module.exports = (req, res, next) => {
    proxy.web(
      req,
      res,
      {
        target: 'http://127.0.0.1:4003/',
        buffer: streamify(req.rawBody),
      },
      next,
    );
  };
  ```

## WebSocket

```javascript
// verbose api
createProxyMiddleware({ pathFilter: '/', target: 'http://echo.websocket.org', ws: true });
```

### External WebSocket upgrade

In the previous WebSocket examples, http-proxy-middleware relies on a initial http request in order to listen to the http `upgrade` event. If you need to proxy WebSockets without the initial http request, you can subscribe to the server's http `upgrade` event manually.

```javascript
const wsProxy = createProxyMiddleware({ target: 'ws://echo.websocket.org', changeOrigin: true });

const app = express();
app.use(wsProxy);

const server = app.listen(3000);
server.on('upgrade', wsProxy.upgrade); // <-- subscribe to http 'upgrade'
```

## Intercept and manipulate requests

Intercept requests from downstream by defining `onProxyReq` in `createProxyMiddleware`.

Currently the only pre-provided request interceptor is `fixRequestBody`, which is used to fix proxied POST requests when `bodyParser` is applied before this middleware.

Example:

```javascript
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

const proxy = createProxyMiddleware({
  /**
   * Fix bodyParser
   **/
  on: {
    proxyReq: fixRequestBody,
  },
});
```

## Intercept and manipulate responses

Intercept responses from upstream with `responseInterceptor`. (Make sure to set `selfHandleResponse: true`)

Responses which are compressed with `brotli`, `gzip` and `deflate` will be decompressed automatically. The response will be returned as `buffer` ([docs](https://nodejs.org/api/buffer.html)) which you can manipulate.

With `buffer`, response manipulation is not limited to text responses (html/css/js, etc...); image manipulation will be possible too. ([example](https://github.com/chimurai/http-proxy-middleware/blob/master/recipes/response-interceptor.md#manipulate-image-response))

NOTE: `responseInterceptor` disables streaming of target's response.

Example:

```javascript
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');

const proxy = createProxyMiddleware({
  /**
   * IMPORTANT: avoid res.end being called automatically
   **/
  selfHandleResponse: true, // res.end() will be called internally by responseInterceptor()

  /**
   * Intercept response and replace 'Hello' with 'Goodbye'
   **/
  on: {
    proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      const response = responseBuffer.toString('utf8'); // convert buffer to string
      return response.replace('Hello', 'Goodbye'); // manipulate response and return the result
    }),
  },
});
```

Check out [interception recipes](https://github.com/chimurai/http-proxy-middleware/blob/master/recipes/response-interceptor.md#readme) for more examples.

## Node.js 17+: ECONNREFUSED issue with IPv6 and localhost ([#705](https://github.com/chimurai/http-proxy-middleware/issues/705))

Node.js 17+ no longer prefers IPv4 over IPv6 for DNS lookups.
E.g. It's **not** guaranteed that `localhost` will be resolved to `127.0.0.1` – it might just as well be `::1` (or some other IP address).

If your target server only accepts IPv4 connections, trying to proxy to `localhost` will fail if resolved to `::1` (IPv6).

Ways to solve it:

- Change `target: "http://localhost"` to `target: "http://127.0.0.1"` (IPv4).
- Change the target server to (also) accept IPv6 connections.
- Add this flag when running `node`: `node index.js --dns-result-order=ipv4first`. (Not recommended.)

> Note: There’s a thing called [Happy Eyeballs](https://en.wikipedia.org/wiki/Happy_Eyeballs) which means connecting to both IPv4 and IPv6 in parallel, which Node.js doesn’t have, but explains why for example `curl` can connect.

## Debugging

Configure the `DEBUG` environment variable enable debug logging.

See [`debug`](https://github.com/debug-js/debug#readme) project for more options.

```shell
DEBUG=http-proxy-middleware* node server.js

$ http-proxy-middleware proxy created +0ms
$ http-proxy-middleware proxying request to target: 'http://www.example.org' +359ms
```

## Working examples

View and play around with [working examples](https://github.com/chimurai/http-proxy-middleware/tree/master/examples).

- Browser-Sync ([example source](https://github.com/chimurai/http-proxy-middleware/tree/master/examples/browser-sync/index.js))
- express ([example source](https://github.com/chimurai/http-proxy-middleware/tree/master/examples/express/index.js))
- connect ([example source](https://github.com/chimurai/http-proxy-middleware/tree/master/examples/connect/index.js))
- WebSocket ([example source](https://github.com/chimurai/http-proxy-middleware/tree/master/examples/websocket/index.js))
- Response Manipulation ([example source](https://github.com/chimurai/http-proxy-middleware/blob/master/examples/response-interceptor/index.js))

## Recipes

View the [recipes](https://github.com/chimurai/http-proxy-middleware/tree/master/recipes) for common use cases.

## Compatible servers

`http-proxy-middleware` is compatible with the following servers:

- [connect](https://www.npmjs.com/package/connect)
- [express](https://www.npmjs.com/package/express)
- [next.js](https://www.npmjs.com/package/next)
- [fastify](https://www.npmjs.com/package/fastify)
- [browser-sync](https://www.npmjs.com/package/browser-sync)
- [lite-server](https://www.npmjs.com/package/lite-server)
- [polka](https://github.com/lukeed/polka)
- [grunt-contrib-connect](https://www.npmjs.com/package/grunt-contrib-connect)
- [grunt-browser-sync](https://www.npmjs.com/package/grunt-browser-sync)
- [gulp-connect](https://www.npmjs.com/package/gulp-connect)
- [gulp-webserver](https://www.npmjs.com/package/gulp-webserver)

Sample implementations can be found in the [server recipes](https://github.com/chimurai/http-proxy-middleware/tree/master/recipes/servers.md).

## Tests

Run the test suite:

```bash
# install dependencies
$ yarn

# linting
$ yarn lint
$ yarn lint:fix

# building (compile typescript to js)
$ yarn build

# unit tests
$ yarn test

# code coverage
$ yarn cover

# check spelling mistakes
$ yarn spellcheck
```

## Changelog

- [View changelog](https://github.com/chimurai/http-proxy-middleware/blob/master/CHANGELOG.md)

## License

The MIT License (MIT)

Copyright (c) 2015-2025 Steven Chim
