# cors

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][github-actions-ci-image]][github-actions-ci-url]
[![Test Coverage][coveralls-image]][coveralls-url]

CORS is a [Node.js](https://nodejs.org/en/) middleware for [Express](https://expressjs.com/)/[Connect](https://github.com/senchalabs/connect) that sets [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) response headers. These headers tell browsers which origins can read responses from your server.

> [!IMPORTANT]
> **How CORS Works:** This package sets response headers—it doesn't block requests. CORS is enforced by browsers: they check the headers and decide if JavaScript can read the response. Non-browser clients (curl, Postman, other servers) ignore CORS entirely. See the [MDN CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) for details.

* [Installation](#installation)
* [Usage](#usage)
  * [Simple Usage](#simple-usage-enable-all-cors-requests)
  * [Enable CORS for a Single Route](#enable-cors-for-a-single-route)
  * [Configuring CORS](#configuring-cors)
  * [Configuring CORS w/ Dynamic Origin](#configuring-cors-w-dynamic-origin)
  * [Enabling CORS Pre-Flight](#enabling-cors-pre-flight)
  * [Customizing CORS Settings Dynamically per Request](#customizing-cors-settings-dynamically-per-request)
* [Configuration Options](#configuration-options)
* [Common Misconceptions](#common-misconceptions)
* [License](#license)
* [Original Author](#original-author)

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/). Installation is done using the
[`npm install` command](https://docs.npmjs.com/downloading-and-installing-packages-locally):

```sh
$ npm install cors
```

## Usage

### Simple Usage (Enable *All* CORS Requests)

```javascript
var express = require('express')
var cors = require('cors')
var app = express()

// Adds headers: Access-Control-Allow-Origin: *
app.use(cors())

app.get('/products/:id', function (req, res, next) {
  res.json({msg: 'Hello'})
})

app.listen(80, function () {
  console.log('web server listening on port 80')
})
```

### Enable CORS for a Single Route

```javascript
var express = require('express')
var cors = require('cors')
var app = express()

// Adds headers: Access-Control-Allow-Origin: *
app.get('/products/:id', cors(), function (req, res, next) {
  res.json({msg: 'Hello'})
})

app.listen(80, function () {
  console.log('web server listening on port 80')
})
```

### Configuring CORS

See the [configuration options](#configuration-options) for details.

```javascript
var express = require('express')
var cors = require('cors')
var app = express()

var corsOptions = {
  origin: 'http://example.com',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

// Adds headers: Access-Control-Allow-Origin: http://example.com, Vary: Origin
app.get('/products/:id', cors(corsOptions), function (req, res, next) {
  res.json({msg: 'Hello'})
})

app.listen(80, function () {
  console.log('web server listening on port 80')
})
```

### Configuring CORS w/ Dynamic Origin

This module supports validating the origin dynamically using a function provided
to the `origin` option. This function will be passed a string that is the origin
(or `undefined` if the request has no origin), and a `callback` with the signature
`callback(error, origin)`.

The `origin` argument to the callback can be any value allowed for the `origin`
option of the middleware, except a function. See the
[configuration options](#configuration-options) section for more information on all
the possible value types.

This function is designed to allow the dynamic loading of allowed origin(s) from
a backing datasource, like a database.

```javascript
var express = require('express')
var cors = require('cors')
var app = express()

var corsOptions = {
  origin: function (origin, callback) {
    // db.loadOrigins is an example call to load
    // a list of origins from a backing database
    db.loadOrigins(function (error, origins) {
      callback(error, origins)
    })
  }
}

// Adds headers: Access-Control-Allow-Origin: <matched origin>, Vary: Origin
app.get('/products/:id', cors(corsOptions), function (req, res, next) {
  res.json({msg: 'Hello'})
})

app.listen(80, function () {
  console.log('web server listening on port 80')
})
```

### Enabling CORS Pre-Flight

Certain CORS requests are considered 'complex' and require an initial
`OPTIONS` request (called the "pre-flight request"). An example of a
'complex' CORS request is one that uses an HTTP verb other than
GET/HEAD/POST (such as DELETE) or that uses custom headers. To enable
pre-flighting, you must add a new OPTIONS handler for the route you want
to support:

```javascript
var express = require('express')
var cors = require('cors')
var app = express()

app.options('/products/:id', cors()) // preflight for DELETE
app.del('/products/:id', cors(), function (req, res, next) {
  res.json({msg: 'Hello'})
})

app.listen(80, function () {
  console.log('web server listening on port 80')
})
```

You can also enable pre-flight across-the-board like so:

```javascript
app.options('*', cors()) // include before other routes
```

NOTE: When using this middleware as an application level middleware (for
example, `app.use(cors())`), pre-flight requests are already handled for all
routes.

### Customizing CORS Settings Dynamically per Request

For APIs that require different CORS configurations for specific routes or requests, you can dynamically generate CORS options based on the incoming request. The `cors` middleware allows you to achieve this by passing a function instead of static options. This function is called for each incoming request and must use the callback pattern to return the appropriate CORS options.

The function accepts:
1. **`req`**: 
   - The incoming request object.

2. **`callback(error, corsOptions)`**: 
   - A function used to return the computed CORS options.
   - **Arguments**:
     - **`error`**: Pass `null` if there’s no error, or an error object to indicate a failure.
     - **`corsOptions`**: An object specifying the CORS policy for the current request.

Here’s an example that handles both public routes and restricted, credential-sensitive routes:

```javascript
var dynamicCorsOptions = function(req, callback) {
  var corsOptions;
  if (req.path.startsWith('/auth/connect/')) {
    // Access-Control-Allow-Origin: http://mydomain.com, Access-Control-Allow-Credentials: true, Vary: Origin
    corsOptions = {
      origin: 'http://mydomain.com',
      credentials: true
    };
  } else {
    // Access-Control-Allow-Origin: *
    corsOptions = { origin: '*' };
  }
  callback(null, corsOptions);
};

app.use(cors(dynamicCorsOptions));

app.get('/auth/connect/twitter', function (req, res) {
  res.send('Hello');
});

app.get('/public', function (req, res) {
  res.send('Hello');
});

app.listen(80, function () {
  console.log('web server listening on port 80')
})
```

## Configuration Options

* `origin`: Configures the **Access-Control-Allow-Origin** CORS header. Possible values:
  - `Boolean` - set `origin` to `true` to reflect the [request origin](https://datatracker.ietf.org/doc/html/draft-abarth-origin-09), as defined by `req.header('Origin')`, or set it to `false` to disable CORS.
  - `String` - set `origin` to a specific origin. For example, if you set it to
    - `"http://example.com"` only requests from "http://example.com" will be allowed.
    - `"*"` for all domains to be allowed. 
  - `RegExp` - set `origin` to a regular expression pattern which will be used to test the request origin. If it's a match, the request origin will be reflected. For example the pattern `/example\.com$/` will reflect any request that is coming from an origin ending with "example.com".
  - `Array` - set `origin` to an array of valid origins. Each origin can be a `String` or a `RegExp`. For example `["http://example1.com", /\.example2\.com$/]` will accept any request from "http://example1.com" or from a subdomain of "example2.com".
  - `Function` - set `origin` to a function implementing some custom logic. The function takes the request origin as the first parameter and a callback (called as `callback(err, origin)`, where `origin` is a non-function value of the `origin` option) as the second.
* `methods`: Configures the **Access-Control-Allow-Methods** CORS header. Expects a comma-delimited string (ex: 'GET,PUT,POST') or an array (ex: `['GET', 'PUT', 'POST']`).
* `allowedHeaders`: Configures the **Access-Control-Allow-Headers** CORS header. Expects a comma-delimited string (ex: 'Content-Type,Authorization') or an array (ex: `['Content-Type', 'Authorization']`). If not specified, defaults to reflecting the headers specified in the request's **Access-Control-Request-Headers** header.
* `exposedHeaders`: Configures the **Access-Control-Expose-Headers** CORS header. Expects a comma-delimited string (ex: 'Content-Range,X-Content-Range') or an array (ex: `['Content-Range', 'X-Content-Range']`). If not specified, no custom headers are exposed.
* `credentials`: Configures the **Access-Control-Allow-Credentials** CORS header. Set to `true` to pass the header, otherwise it is omitted.
* `maxAge`: Configures the **Access-Control-Max-Age** CORS header. Set to an integer to pass the header, otherwise it is omitted.
* `preflightContinue`: Pass the CORS preflight response to the next handler.
* `optionsSuccessStatus`: Provides a status code to use for successful `OPTIONS` requests, since some legacy browsers (IE11, various SmartTVs) choke on `204`.

The default configuration is the equivalent of:

```json
{
  "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
}
```

## Common Misconceptions

### "CORS blocks requests from disallowed origins"

**No.** Your server receives and processes every request. CORS headers tell the browser whether JavaScript can read the response—not whether the request is allowed.

### "CORS protects my API from unauthorized access"

**No.** CORS is not access control. Any HTTP client (curl, Postman, another server) can call your API regardless of CORS settings. Use authentication and authorization to protect your API.

### "Setting `origin: 'http://example.com'` means only that domain can access my server"

**No.** It means browsers will only let JavaScript from that origin read responses. The server still responds to all requests.

## License

[MIT License](http://www.opensource.org/licenses/mit-license.php)

## Original Author

[Troy Goode](https://github.com/TroyGoode) ([troygoode@gmail.com](mailto:troygoode@gmail.com))

[coveralls-image]: https://img.shields.io/coveralls/expressjs/cors/master.svg
[coveralls-url]: https://coveralls.io/r/expressjs/cors?branch=master
[downloads-image]: https://img.shields.io/npm/dm/cors.svg
[downloads-url]: https://npmjs.com/package/cors
[github-actions-ci-image]: https://img.shields.io/github/actions/workflow/status/expressjs/cors/ci.yml?branch=master&label=ci
[github-actions-ci-url]: https://github.com/expressjs/cors?query=workflow%3Aci
[npm-image]: https://img.shields.io/npm/v/cors.svg
[npm-url]: https://npmjs.com/package/cors
