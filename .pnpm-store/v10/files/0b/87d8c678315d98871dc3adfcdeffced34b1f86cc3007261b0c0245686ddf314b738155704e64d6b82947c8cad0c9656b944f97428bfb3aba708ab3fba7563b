# cookie-parser

[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![Build Status][ci-image]][ci-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Parse `Cookie` header and populate `req.cookies` with an object keyed by the
cookie names. Optionally you may enable signed cookie support by passing a
`secret` string, which assigns `req.secret` so it may be used by other
middleware.

## Installation

```sh
$ npm install cookie-parser
```

## API

```js
var cookieParser = require('cookie-parser')
```

### cookieParser(secret, options)

Create a new cookie parser middleware function using the given `secret` and
`options`.

- `secret` a string or array used for signing cookies. This is optional and if
  not specified, will not parse signed cookies. If a string is provided, this
  is used as the secret. If an array is provided, an attempt will be made to
  unsign the cookie with each secret in order.
- `options` an object that is passed to `cookie.parse` as the second option. See
  [cookie](https://www.npmjs.org/package/cookie) for more information.
  - `decode` a function to decode the value of the cookie

The middleware will parse the `Cookie` header on the request and expose the
cookie data as the property `req.cookies` and, if a `secret` was provided, as
the property `req.signedCookies`. These properties are name value pairs of the
cookie name to cookie value.

When `secret` is provided, this module will unsign and validate any signed cookie
values and move those name value pairs from `req.cookies` into `req.signedCookies`.
A signed cookie is a cookie that has a value prefixed with `s:`. Signed cookies
that fail signature validation will have the value `false` instead of the tampered
value.

In addition, this module supports special "JSON cookies". These are cookie where
the value is prefixed with `j:`. When these values are encountered, the value will
be exposed as the result of `JSON.parse`. If parsing fails, the original value will
remain.

### cookieParser.JSONCookie(str)

Parse a cookie value as a JSON cookie. This will return the parsed JSON value
if it was a JSON cookie, otherwise, it will return the passed value.

### cookieParser.JSONCookies(cookies)

Given an object, this will iterate over the keys and call `JSONCookie` on each
value, replacing the original value with the parsed value. This returns the
same object that was passed in.

### cookieParser.signedCookie(str, secret)

Parse a cookie value as a signed cookie. This will return the parsed unsigned
value if it was a signed cookie and the signature was valid. If the value was
not signed, the original value is returned. If the value was signed but the
signature could not be validated, `false` is returned.

The `secret` argument can be an array or string. If a string is provided, this
is used as the secret. If an array is provided, an attempt will be made to
unsign the cookie with each secret in order.

### cookieParser.signedCookies(cookies, secret)

Given an object, this will iterate over the keys and check if any value is a
signed cookie. If it is a signed cookie and the signature is valid, the key
will be deleted from the object and added to the new object that is returned.

The `secret` argument can be an array or string. If a string is provided, this
is used as the secret. If an array is provided, an attempt will be made to
unsign the cookie with each secret in order.

## Example

```js
var express = require('express')
var cookieParser = require('cookie-parser')

var app = express()
app.use(cookieParser())

app.get('/', function (req, res) {
  // Cookies that have not been signed
  console.log('Cookies: ', req.cookies)

  // Cookies that have been signed
  console.log('Signed Cookies: ', req.signedCookies)
})

app.listen(8080)

// curl command that sends an HTTP request with two cookies
// curl http://127.0.0.1:8080 --cookie "Cho=Kim;Greet=Hello"
```

## License

[MIT](LICENSE)

[ci-image]: https://badgen.net/github/checks/expressjs/cookie-parser/master?label=ci
[ci-url]: https://github.com/expressjs/cookie-parser/actions?query=workflow%3Aci
[coveralls-image]: https://badgen.net/coveralls/c/github/expressjs/cookie-parser/master
[coveralls-url]: https://coveralls.io/r/expressjs/cookie-parser?branch=master
[npm-downloads-image]: https://badgen.net/npm/dm/cookie-parser
[npm-url]: https://npmjs.org/package/cookie-parser
[npm-version-image]: https://badgen.net/npm/v/cookie-parser
