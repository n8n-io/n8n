# Nock

[![npm](https://img.shields.io/npm/v/nock.svg)][npmjs]
![Coverage Status](http://img.shields.io/badge/coverage-100%25-brightgreen.svg)
[![Backers on Open Collective](https://opencollective.com/nock/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/nock/sponsors/badge.svg)](#sponsors)

[npmjs]: https://www.npmjs.com/package/nock

HTTP server mocking and expectations library for Node.js

Nock can be used to test modules that perform HTTP requests in isolation.

For instance, if a module performs HTTP requests to a CouchDB server or makes HTTP requests to the Amazon API, you can test that module in isolation.

**Table of Contents**

<!-- toc -->

- [How does it work?](#how-does-it-work)
- [Install](#install)
  - [Node version support](#node-version-support)
- [Usage](#usage)
  - [READ THIS! - About interceptors](#read-this---about-interceptors)
  - [Specifying hostname](#specifying-hostname)
  - [Specifying path](#specifying-path)
  - [Specifying request body](#specifying-request-body)
  - [Specifying request query string](#specifying-request-query-string)
  - [Specifying replies](#specifying-replies)
    - [Access original request and headers](#access-original-request-and-headers)
    - [Replying with errors](#replying-with-errors)
  - [Specifying headers](#specifying-headers)
    - [Header field names are case-insensitive](#header-field-names-are-case-insensitive)
    - [Specifying Request Headers](#specifying-request-headers)
    - [Specifying Reply Headers](#specifying-reply-headers)
    - [Default Reply Headers](#default-reply-headers)
    - [Including Content-Length Header Automatically](#including-content-length-header-automatically)
    - [Including Date Header Automatically](#including-date-header-automatically)
  - [HTTP Verbs](#http-verbs)
  - [Support for HTTP and HTTPS](#support-for-http-and-https)
  - [Non-standard ports](#non-standard-ports)
  - [Repeat response n times](#repeat-response-n-times)
  - [Delay the response](#delay-the-response)
    - [Delay the connection](#delay-the-connection)
      - [Technical Details](#technical-details)
    - [Delay the response body](#delay-the-response-body)
      - [Technical Details](#technical-details-1)
  - [Chaining](#chaining)
  - [Scope filtering](#scope-filtering)
  - [Conditional scope filtering](#conditional-scope-filtering)
  - [Path filtering](#path-filtering)
  - [Request Body filtering](#request-body-filtering)
  - [Request Headers Matching](#request-headers-matching)
  - [Optional Requests](#optional-requests)
  - [Allow **unmocked** requests on a mocked hostname](#allow-unmocked-requests-on-a-mocked-hostname)
- [Expectations](#expectations)
  - [.isDone()](#isdone)
  - [.cleanAll()](#cleanall)
  - [.abortPendingRequests()](#abortpendingrequests)
  - [.persist()](#persist)
  - [.pendingMocks()](#pendingmocks)
  - [.activeMocks()](#activemocks)
  - [.isActive()](#isactive)
  - [.clone()](#clone)
- [Restoring](#restoring)
- [Activating](#activating)
- [Turning Nock Off (experimental!)](#turning-nock-off-experimental)
- [Enable/Disable real HTTP requests](#enabledisable-real-http-requests)
  - [Disabling requests](#disabling-requests)
  - [Enabling requests](#enabling-requests)
  - [Resetting NetConnect](#resetting-netconnect)
- [Recording](#recording)
  - [`dont_print` option](#dont_print-option)
  - [`output_objects` option](#output_objects-option)
  - [`enable_reqheaders_recording` option](#enable_reqheaders_recording-option)
  - [`logging` option](#logging-option)
  - [`use_separator` option](#use_separator-option)
  - [.removeInterceptor()](#removeinterceptor)
- [Events](#events)
  - [Global no match event](#global-no-match-event)
- [Nock Back](#nock-back)
  - [Setup](#setup)
    - [Options](#options)
  - [Usage](#usage-1)
    - [Options](#options-1)
      - [Example](#example)
  - [Modes](#modes)
  - [Verifying recorded fixtures](#verifying-recorded-fixtures)
    - [Example](#example-1)
- [Common issues](#common-issues)
  - [Axios](#axios)
  - [Memory issues with Jest](#memory-issues-with-jest)
- [Debugging](#debugging)
- [Contributing](#contributing)
- [Contributors](#contributors)
- [Sponsors](#sponsors)
- [License](#license)

<!-- tocstop -->

## How does it work?

Nock works by overriding Node's `http.request` function. Also, it overrides `http.ClientRequest` too to cover for modules that use it directly.

## Install

```sh
$ npm install --save-dev nock
```

### Node version support

The latest version of nock supports all currently maintained Node versions, see [Node Release Schedule](https://github.com/nodejs/Release#release-schedule)

Here is a list of past nock versions with respective node version support

| node | nock       |
| ---- | ---------- |
| 0.10 | up to 8.x  |
| 0.11 | up to 8.x  |
| 0.12 | up to 8.x  |
| 4    | up to 9.x  |
| 5    | up to 8.x  |
| 6    | up to 10.x |
| 7    | up to 9.x  |
| 8    | up to 11.x |
| 9    | up to 9.x  |

## Usage

On your test, you can setup your mocking object like this:

```js
const nock = require('nock')

const scope = nock('https://api.github.com')
  .get('/repos/atom/atom/license')
  .reply(200, {
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
      node_id: 'MDc6TGljZW5zZTEz',
    },
  })
```

This setup says that we will intercept every HTTP call to `https://api.github.com`.

It will intercept an HTTPS GET request to `/repos/atom/atom/license`, reply with
a status 200, and the body will contain a (partial) response in JSON.

### READ THIS! - About interceptors

When you setup an interceptor for a URL and that interceptor is used, it is removed from the interceptor list.
This means that you can intercept 2 or more calls to the same URL and return different things on each of them.
It also means that you must setup one interceptor for each request you are going to have, otherwise nock will throw an error because that URL was not present in the interceptor list.
If you don’t want interceptors to be removed as they are used, you can use the [.persist()](#persist) method.

### Specifying hostname

The request hostname can be a string, URL, or a RegExp.

```js
const scope = nock('http://www.example.com')
  .get('/resource')
  .reply(200, 'domain matched')
```

```js
const scope = nock(new URL('http://www.example.com'))
  .get('/resource')
  .reply(200, 'domain matched')
```

```js
const scope = nock(/example\.com/)
  .get('/resource')
  .reply(200, 'domain regex matched')
```

> Note: You can choose to include or not the protocol in the hostname matching.

### Specifying path

The request path can be a string, a RegExp or a filter function and you can use any [HTTP verb](#http-verbs).

Using a string:

```js
const scope = nock('http://www.example.com')
  .get('/resource')
  .reply(200, 'path matched')
```

Using a regular expression:

```js
const scope = nock('http://www.example.com')
  .get(/source$/)
  .reply(200, 'path using regex matched')
```

Using a function:

```js
const scope = nock('http://www.example.com')
  .get(uri => uri.includes('cats'))
  .reply(200, 'path using function matched')
```

### Specifying request body

You can specify the request body to be matched as the second argument to the `get`, `post`, `put` or `delete` specifications. There are five types of second argument allowed:

**String**: nock will exact match the stringified request body with the provided string

```js
nock('http://www.example.com')
  .post('/login', 'username=pgte&password=123456')
  .reply(200, { id: '123ABC' })
```

**Buffer**: nock will exact match the stringified request body with the provided buffer

```js
nock('http://www.example.com')
  .post('/login', Buffer.from([0xff, 0x11]))
  .reply(200, { id: '123ABC' })
```

**RegExp**: nock will test the stringified request body against the provided RegExp

```js
nock('http://www.example.com')
  .post('/login', /username=\w+/gi)
  .reply(200, { id: '123ABC' })
```

**JSON object**: nock will exact match the request body with the provided object. In order to increase flexibility, nock also supports RegExp as an attribute value for the keys:

```js
nock('http://www.example.com')
  .post('/login', { username: 'pgte', password: /.+/i })
  .reply(200, { id: '123ABC' })
```

**Function**: nock will evaluate the function providing the request body object as first argument. Return true if it should be considered a match:

```js
nock('http://www.example.com')
  .post('/login', body => body.username && body.password)
  .reply(200, { id: '123ABC' })
```

In case you need to perform a partial matching on a complex, nested request body you should have a look at libraries like [lodash.matches](https://lodash.com/docs/#matches). Indeed, partial matching can be achieved as:

```js
nock('http://www.example.com')
  .post('/user', _.matches({ address: { country: 'US' } }))
  .reply(200, { id: '123ABC' })
```

### Specifying request query string

Nock understands query strings. Search parameters can be included as part of the path:

```js
nock('http://example.com').get('/users?foo=bar').reply(200)
```

Instead of placing the entire URL, you can specify the query part as an object:

```js
nock('http://example.com')
  .get('/users')
  .query({ name: 'pedro', surname: 'teixeira' })
  .reply(200, { results: [{ id: 'pgte' }] })
```

Nock supports array-style/object-style query parameters. The encoding format matches with request module.

```js
nock('http://example.com')
  .get('/users')
  .query({
    names: ['alice', 'bob'],
    tags: {
      alice: ['admin', 'tester'],
      bob: ['tester'],
    },
  })
  .reply(200, { results: [{ id: 'pgte' }] })
```

A `URLSearchParams` instance can be provided.

```js
const params = new URLSearchParams({ foo: 'bar' })

nock('http://example.com').get('/').query(params).reply(200)
```

Nock supports passing a function to query. The function determines if the actual query matches or not.

```js
nock('http://example.com')
  .get('/users')
  .query(actualQueryObject => {
    // do some compare with the actual Query Object
    // return true for matched
    // return false for not matched
    return true
  })
  .reply(200, { results: [{ id: 'pgte' }] })
```

To mock the entire url regardless of the passed query string:

```js
nock('http://example.com')
  .get('/users')
  .query(true)
  .reply(200, { results: [{ id: 'pgte' }] })
```

A query string that is already [URL encoded](https://en.wikipedia.org/wiki/Percent-encoding) can be
matched by passing the `encodedQueryParams` flag in the options when creating the Scope.

```js
nock('http://example.com', { encodedQueryParams: true })
  .get('/users')
  .query('foo%5Bbar%5D%3Dhello%20world%21')
  .reply(200, { results: [{ id: 'pgte' }] })
```

### Specifying replies

You can specify the return status code for a path on the first argument of reply like this:

```js
const scope = nock('http://myapp.iriscouch.com').get('/users/1').reply(404)
```

You can also specify the reply body as a string:

```js
const scope = nock('http://www.google.com')
  .get('/')
  .reply(200, 'Hello from Google!')
```

or as a JSON-encoded object:

```js
const scope = nock('http://myapp.iriscouch.com').get('/').reply(200, {
  username: 'pgte',
  email: 'pedro.teixeira@gmail.com',
  _id: '4324243fsd',
})
```

or even as a file:

```js
const scope = nock('http://myapp.iriscouch.com')
  .get('/')
  .replyWithFile(200, __dirname + '/replies/user.json', {
    'Content-Type': 'application/json',
  })
```

Instead of an object or a buffer you can also pass in a callback to be evaluated for the value of the response body:

```js
const scope = nock('http://www.google.com')
  .post('/echo')
  .reply(201, (uri, requestBody) => requestBody)
```

In Nock 11.x it was possible to invoke `.reply()` with a status code and a
function that returns an array containing a status code and body. (The status
code from the array would take precedence over the one passed directly to
reply.) This is no longer allowed. In Nock 12 and later, either call `.reply()` with a
status code and a function that returns the body, or call it with a single
argument: a function that returns an array containing both the status code and
body.

An asynchronous function that gets an error-first callback as its last argument also works:

```js
const scope = nock('http://www.google.com')
  .post('/echo')
  .reply(201, (uri, requestBody, cb) => {
    fs.readFile('cat-poems.txt', cb) // Error-first callback
  })
```

In Nock 11 and later, if an error is passed to the callback, Nock will rethrow it as a programmer error.
In Nock 10 and earlier, the error was sent in the response body, with a 500 HTTP response status code.

You can also return the status code and body using just one function:

```js
const scope = nock('http://www.google.com')
  .post('/echo')
  .reply((uri, requestBody) => {
    return [
      201,
      'THIS IS THE REPLY BODY',
      { header: 'value' }, // optional headers
    ]
  })
```

or, use an error-first callback that also gets the status code:

```js
const scope = nock('http://www.google.com')
  .post('/echo')
  .reply((uri, requestBody, cb) => {
    setTimeout(() => cb(null, [201, 'THIS IS THE REPLY BODY']), 1000)
  })
```

A Stream works too:

```js
const scope = nock('http://www.google.com')
  .get('/cat-poems')
  .reply(200, (uri, requestBody) => {
    return fs.createReadStream('cat-poems.txt')
  })
```

#### Access original request and headers

If you're using the reply callback style, you can access the original client request using `this.req` like this:

```js
const scope = nock('http://www.google.com')
  .get('/cat-poems')
  .reply(function (uri, requestBody) {
    console.log('path:', this.req.path)
    console.log('headers:', this.req.headers)
    // ...
  })
```

> Note: Remember to use normal `function` in that case, as arrow functions are using enclosing scope for `this` binding.

#### Replying with errors

You can reply with an error like this:

```js
nock('http://www.google.com')
  .get('/cat-poems')
  .replyWithError('something awful happened')
```

JSON error responses are allowed too:

```js
nock('http://www.google.com').get('/cat-poems').replyWithError({
  message: 'something awful happened',
  code: 'AWFUL_ERROR',
})
```

> Note: This will emit an `error` event on the `request` object, not the reply.

### Specifying headers

#### Header field names are case-insensitive

Per [HTTP/1.1 4.2 Message Headers](http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2) specification, all message headers are case insensitive and thus internally Nock uses lower-case for all field names even if some other combination of cases was specified either in mocking specification or in mocked requests themselves.

#### Specifying Request Headers

You can specify the request headers like this:

```js
const scope = nock('http://www.example.com', {
  reqheaders: {
    authorization: 'Basic Auth',
  },
})
  .get('/')
  .reply(200)
```

Or you can use a regular expression or function to check the header values. The
function will be passed the header value.

```js
const scope = nock('http://www.example.com', {
  reqheaders: {
    'X-My-Headers': headerValue => headerValue.includes('cats'),
    'X-My-Awesome-Header': /Awesome/i,
  },
})
  .get('/')
  .reply(200)
```

If `reqheaders` is not specified or if `host` is not part of it, Nock will automatically add `host` value to request header.

If no request headers are specified for mocking then Nock will automatically skip matching of request headers. Since the `host` header is a special case which may get automatically inserted by Nock, its matching is skipped unless it was _also_ specified in the request being mocked.

You can also have Nock fail the request if certain headers are present:

```js
const scope = nock('http://www.example.com', {
  badheaders: ['cookie', 'x-forwarded-for'],
})
  .get('/')
  .reply(200)
```

When invoked with this option, Nock will not match the request if any of the `badheaders` are present.

Basic authentication can be specified as follows:

```js
const scope = nock('http://www.example.com')
  .get('/')
  .basicAuth({ user: 'john', pass: 'doe' })
  .reply(200)
```

#### Specifying Reply Headers

You can specify the reply headers like this:

```js
const scope = nock('https://api.github.com')
  .get('/repos/atom/atom/license')
  .reply(200, { license: 'MIT' }, { 'X-RateLimit-Remaining': 4999 })
```

Or you can use a function to generate the headers values. The function will be
passed the request, response, and response body (if available). The body will
be either a buffer, a stream, or undefined.

```js
const scope = nock('http://www.headdy.com')
  .get('/')
  .reply(200, 'Hello World!', {
    'Content-Length': (req, res, body) => body.length,
    ETag: () => `${Date.now()}`,
  })
```

#### Default Reply Headers

You can also specify default reply headers for all responses like this:

```js
const scope = nock('http://www.headdy.com')
  .defaultReplyHeaders({
    'X-Powered-By': 'Rails',
    'Content-Type': 'application/json',
  })
  .get('/')
  .reply(200, 'The default headers should come too')
```

Or you can use a function to generate the default headers values:

```js
const scope = nock('http://www.headdy.com')
  .defaultReplyHeaders({
    'Content-Length': (req, res, body) => body.length,
  })
  .get('/')
  .reply(200, 'The default headers should come too')
```

#### Including Content-Length Header Automatically

When using `interceptor.reply()` to set a response body manually, you can have the
`Content-Length` header calculated automatically.

```js
const scope = nock('http://www.headdy.com')
  .replyContentLength()
  .get('/')
  .reply(200, { hello: 'world' })
```

**NOTE:** this does not work with streams or other advanced means of specifying
the reply body.

#### Including Date Header Automatically

You can automatically append a `Date` header to your mock reply:

```js
const scope = nock('http://www.headdy.com')
  .replyDate()
  .get('/')
  .reply(200, { hello: 'world' })
```

Or provide your own `Date` object:

```js
const scope = nock('http://www.headdy.com')
  .replyDate(new Date(2015, 0, 1))
  .get('/')
  .reply(200, { hello: 'world' })
```

### HTTP Verbs

Nock supports any HTTP verb, and it has convenience methods for the GET, POST, PUT, HEAD, DELETE, PATCH, OPTIONS and MERGE HTTP verbs.

You can intercept any HTTP verb using `.intercept(path, verb [, requestBody [, options]])`:

```js
const scope = nock('http://my.domain.com')
  .intercept('/path', 'PATCH')
  .reply(304)
```

### Support for HTTP and HTTPS

By default nock assumes HTTP. If you need to use HTTPS you can specify the `https://` prefix like this:

```js
const scope = nock('https://secure.my.server.com')
// ...
```

### Non-standard ports

You are able to specify a non-standard port like this:

```js
const scope = nock('http://my.server.com:8081')
```

### Repeat response n times

You are able to specify the number of times to repeat the same response.

**NOTE:** When request times is more than the number you specified, you will get an error before cleaning this interceptor.

```js
nock('http://zombo.com').get('/').times(4).reply(200, 'Ok')

http.get('http://zombo.com/') // respond body "Ok"
http.get('http://zombo.com/') // respond body "Ok"
http.get('http://zombo.com/') // respond body "Ok"
http.get('http://zombo.com/') // respond body "Ok"

// This code will get an error with message:
// Nock: No match for request
http.get('http://zombo.com/')

// clean your interceptor
nock.cleanAll()

http.get('http://zombo.com/') // real respond with zombo.com result
```

Sugar syntax

```js
nock('http://zombo.com').get('/').once().reply(200, 'Ok')
nock('http://zombo.com').get('/').twice().reply(200, 'Ok')
nock('http://zombo.com').get('/').thrice().reply(200, 'Ok')
```

To repeat this response for as long as nock is active, use [.persist()](#persist).

### Delay the response

Nock can simulate response latency to allow you to test timeouts, race conditions, an other timing related scenarios.  
You are able to specify the number of milliseconds that your reply should be delayed.

```js
nock('http://my.server.com')
  .get('/')
  .delay(2000) // 2 seconds delay will be applied to the response body.
  .reply(200, '<html></html>')
```

#### Delay the connection

The `delayConnection` method’s behavior of emitting quick timeout events when the connection delay exceeds the request timeout is now deprecated. Please use the `delay` function instead.

#### Delay the response body

The `delayBody` is now deprecated. Please use the `delay` function instead.

```js
nock('http://my.server.com')
  .get('/')
  .delayBody(2000) // 2 seconds
  .reply(200, '<html></html>')
```

##### Technical Details

Following the [`'response'`](http://nodejs.org/api/http.html#http_event_response) being emitted by `ClientRequest`,
Nock will register a timeout timer with the body delay value to delay real time before the [IncomingMessage](http://nodejs.org/api/http.html#http_http_incomingmessage) emits its first `'data'` or the `'end'` event.

### Chaining

You can chain behaviour like this:

```js
const scope = nock('http://myapp.iriscouch.com')
  .get('/users/1')
  .reply(404)
  .post('/users', {
    username: 'pgte',
    email: 'pedro.teixeira@gmail.com',
  })
  .reply(201, {
    ok: true,
    id: '123ABC',
    rev: '946B7D1C',
  })
  .get('/users/123ABC')
  .reply(200, {
    _id: '123ABC',
    _rev: '946B7D1C',
    username: 'pgte',
    email: 'pedro.teixeira@gmail.com',
  })
```

### Scope filtering

You can filter the scope (protocol, domain or port) of nock through a function. The filtering function is accepted at the `filteringScope` field of the `options` argument.

This can be useful if you have a node module that randomly changes subdomains to which it sends requests, e.g., the Dropbox node module behaves like this.

```js
const scope = nock('https://api.dropbox.com', {
  filteringScope: scope => /^https:\/\/api[0-9]*.dropbox.com/.test(scope),
})
  .get('/1/metadata/auto/Photos?include_deleted=false&list=true')
  .reply(200)
```

### Conditional scope filtering

You can also choose to filter out a scope based on your system environment (or any external factor). The filtering function is accepted at the `conditionally` field of the `options` argument.

This can be useful if you only want certain scopes to apply depending on how your tests are executed.

```js
const scope = nock('https://api.myservice.com', {
  conditionally: () => true,
})
```

### Path filtering

You can also filter the URLs based on a function.

This can be useful, for instance, if you have random or time-dependent data in your URL.

You can use a regexp for replacement, just like String.prototype.replace:

```js
const scope = nock('http://api.myservice.com')
  .filteringPath(/password=[^&]*/g, 'password=XXX')
  .get('/users/1?password=XXX')
  .reply(200, 'user')
```

Or you can use a function:

```js
const scope = nock('http://api.myservice.com')
  .filteringPath(path => '/ABC')
  .get('/ABC')
  .reply(200, 'user')
```

Note that `scope.filteringPath` is not cumulative: it should only be used once per scope.

### Request Body filtering

You can also filter the request body based on a function.

This can be useful, for instance, if you have random or time-dependent data in your request body.

You can use a regexp for replacement, just like String.prototype.replace:

```js
const scope = nock('http://api.myservice.com')
  .filteringRequestBody(/password=[^&]*/g, 'password=XXX')
  .post('/users/1', 'data=ABC&password=XXX')
  .reply(201, 'OK')
```

Or you can use a function to transform the body:

```js
const scope = nock('http://api.myservice.com')
  .filteringRequestBody(body => 'ABC')
  .post('/', 'ABC')
  .reply(201, 'OK')
```

If you don't want to match the request body you should omit the `body` argument from the method function:

```js
const scope = nock('http://api.myservice.com')
  .post('/some_uri') // no body argument
  .reply(200, 'OK')
```

### Request Headers Matching

If you need to match requests only if certain request headers match, you can.

```js
const scope = nock('http://api.myservice.com')
  // Interceptors created after here will only match when the header `accept` equals `application/json`.
  .matchHeader('accept', 'application/json')
  .get('/')
  .reply(200, {
    data: 'hello world',
  })
  .get('/')
  // Only this interceptor will match the header value `x-my-action` with `MyFirstAction`
  .matchHeader('x-my-action', 'MyFirstAction')
  .reply(200, {
    data: 'FirstActionResponse',
  })
  .get('/')
  // Only this interceptor will match the header value `x-my-action` with `MySecondAction`
  .matchHeader('x-my-action', 'MySecondAction')
  .reply(200, {
    data: 'SecondActionResponse',
  })
```

You can also use a regexp for the header body.

```js
const scope = nock('http://api.myservice.com')
  .matchHeader('User-Agent', /Mozilla\/.*/)
  .get('/')
  .reply(200, {
    data: 'hello world',
  })
```

You can also use a function for the header body.

```js
const scope = nock('http://api.myservice.com')
  .matchHeader('content-length', val => val >= 1000)
  .get('/')
  .reply(200, {
    data: 'hello world',
  })
```

### Optional Requests

By default every mocked request is expected to be made exactly once, and until it is it'll appear in `scope.pendingMocks()`, and `scope.isDone()` will return false (see [expectations](#expectations)). In many cases this is fine, but in some (especially cross-test setup code) it's useful to be able to mock a request that may or may not happen. You can do this with `optionally()`. Optional requests are consumed just like normal ones once matched, but they do not appear in `pendingMocks()`, and `isDone()` will return true for scopes with only optional requests pending.

```js
const example = nock('http://example.com')
example.pendingMocks() // []
example.get('/pathA').reply(200)
example.pendingMocks() // ["GET http://example.com:80/path"]

// ...After a request to example.com/pathA:
example.pendingMocks() // []

example.get('/pathB').optionally().reply(200)
example.pendingMocks() // []

// You can also pass a boolean argument to `optionally()`. This
// is useful if you want to conditionally make a mocked request
// optional.
const getMock = optional =>
  example.get('/pathC').optionally(optional).reply(200)

getMock(true)
example.pendingMocks() // []
getMock(false)
example.pendingMocks() // ["GET http://example.com:80/pathC"]
```

### Allow **unmocked** requests on a mocked hostname

If you need some request on the same host name to be mocked and some others to **really** go through the HTTP stack, you can use the `allowUnmocked` option like this:

```js
const scope = nock('http://my.existing.service.com', { allowUnmocked: true })
  .get('/my/url')
  .reply(200, 'OK!')

// GET /my/url => goes through nock
// GET /other/url => actually makes request to the server
```

> Note: When applying `{allowUnmocked: true}`, if the request is made to the real server, no interceptor is removed.

## Expectations

Every time an HTTP request is performed for a scope that is mocked, Nock expects to find a handler for it. If it doesn't, it will throw an error.

Calls to nock() return a scope which you can assert by calling `scope.done()`. This will assert that all specified calls on that scope were performed.

Example:

```js
const scope = nock('http://google.com')
  .get('/')
  .reply(200, 'Hello from Google!')

// do some stuff

setTimeout(() => {
  // Will throw an assertion error if meanwhile a "GET http://google.com" was
  // not performed.
  scope.done()
}, 5000)
```

### .isDone()

You can call `isDone()` on a single expectation to determine if the expectation was met:

```js
const scope = nock('http://google.com').get('/').reply(200)

scope.isDone() // will return false
```

It is also available in the global scope, which will determine if all expectations have been met:

```js
nock.isDone()
```

### .cleanAll()

You can cleanup all the prepared mocks (could be useful to cleanup some state after a failed test) like this:

```js
nock.cleanAll()
```

### .abortPendingRequests()

You can abort all current pending request like this:

```js
nock.abortPendingRequests()
```

### .persist()

You can make all the interceptors for a scope persist by calling `.persist()` on it:

```js
const scope = nock('http://example.com')
  .persist()
  .get('/')
  .reply(200, 'Persisting all the way')
```

Note that while a persisted scope will always intercept the requests, it is considered "done" after the first interception.

If you want to stop persisting an individual persisted mock you can call `persist(false)`:

```js
const scope = nock('http://example.com').persist().get('/').reply(200, 'ok')

// Do some tests ...

scope.persist(false)
```

You can also use `nock.cleanAll()` which removes all mocks, including persistent mocks.

To specify an exact number of times that nock should repeat the response, use [.times()](#repeat-response-n-times).

### .pendingMocks()

If a scope is not done, you can inspect the scope to infer which ones are still pending using the `scope.pendingMocks()` function:

```js
if (!scope.isDone()) {
  console.error('pending mocks: %j', scope.pendingMocks())
}
```

It is also available in the global scope:

```js
console.error('pending mocks: %j', nock.pendingMocks())
```

### .activeMocks()

You can see every mock that is currently active (i.e. might potentially reply to requests) in a scope using `scope.activeMocks()`. A mock is active if it is pending, optional but not yet completed, or persisted. Mocks that have intercepted their requests and are no longer doing anything are the only mocks which won't appear here.

You probably don't need to use this - it mainly exists as a mechanism to recreate the previous (now-changed) behavior of `pendingMocks()`.

```js
console.error('active mocks: %j', scope.activeMocks())
```

It is also available in the global scope:

```js
console.error('active mocks: %j', nock.activeMocks())
```

### .isActive()

Your tests may sometimes want to deactivate the nock interceptor.
Once deactivated, nock needs to be re-activated to work.
You can check if nock interceptor is active or not by using `nock.isActive()`.
Sample:

```js
if (!nock.isActive()) {
  nock.activate()
}
```

### .clone()

You can clone a scope by calling `.clone()` on it:

```js
const scope = nock('http://example.test')

const getScope = scope.get('/').reply(200)
const postScope = scope.clone().post('/').reply(200)
```

## Restoring

You can restore the HTTP interceptor to the normal unmocked behaviour by calling:

```js
nock.restore()
```

**note 1**: restore does not clear the interceptor list. Use [nock.cleanAll()](#cleanall) if you expect the interceptor list to be empty.

**note 2**: restore will also remove the http interceptor itself. You need to run [nock.activate()](#activating) to re-activate the http interceptor. Without re-activation, nock will not intercept any calls.

## Activating

Only for cases where nock has been deactivated using [nock.restore()](#restoring), you can reactivate the HTTP interceptor to start intercepting HTTP calls using:

```js
nock.activate()
```

**note**: To check if nock HTTP interceptor is active or inactive, use [nock.isActive()](#isactive).

## Turning Nock Off (experimental!)

You can bypass Nock completely by setting the `NOCK_OFF` environment variable to `"true"`.

This way you can have your tests hit the real servers just by switching on this environment variable.

```shell script
$ NOCK_OFF=true node my_test.js
```

## Enable/Disable real HTTP requests

By default, any requests made to a host that is not mocked will be executed normally. If you want to block these requests, nock allows you to do so.

### Disabling requests

For disabling real http requests.

```js
nock.disableNetConnect()
```

So, if you try to request any host not 'nocked', it will throw a `NetConnectNotAllowedError`.

```js
nock.disableNetConnect()
const req = http.get('http://google.com/')
req.on('error', err => {
  console.log(err)
})
// The returned `http.ClientRequest` will emit an error event (or throw if you're not listening for it)
// This code will log a NetConnectNotAllowedError with message:
// Nock: Disallowed net connect for "google.com:80"
```

### Enabling requests

For enabling any real HTTP requests (the default behavior):

```js
nock.enableNetConnect()
```

You could allow real HTTP requests for certain host names by providing a string or a regular expression for the hostname, or a function that accepts the hostname and returns true or false:

```js
// Using a string
nock.enableNetConnect('amazon.com')

// Or a RegExp
nock.enableNetConnect(/(amazon|github)\.com/)

// Or a Function
nock.enableNetConnect(
  host => host.includes('amazon.com') || host.includes('github.com'),
)

http.get('http://www.amazon.com/')
http.get('http://github.com/')

http.get('http://google.com/')
// This will throw NetConnectNotAllowedError with message:
// Nock: Disallowed net connect for "google.com:80"
```

A common use case when testing local endpoints would be to disable all but localhost, then add in additional nocks for external requests:

```js
nock.disableNetConnect()
// Allow localhost connections so we can test local routes and mock servers.
nock.enableNetConnect('127.0.0.1')
```

### Resetting NetConnect

When you're done with the test, you probably want to set everything back to normal:

```js
nock.cleanAll()
nock.enableNetConnect()
```

## Recording

This is a cool feature:

Guessing what the HTTP calls are is a mess, especially if you are introducing nock on your already-coded tests.

For these cases where you want to mock an existing live system you can record and playback the HTTP calls like this:

```js
nock.recorder.rec()
// Some HTTP calls happen and the nock code necessary to mock
// those calls will be outputted to console
```

Recording relies on intercepting real requests and responses and then persisting them for later use.

In order to stop recording you should call `nock.restore()` and recording will stop.

**ATTENTION!:** when recording is enabled, nock does no validation, nor will any mocks be enabled. Please be sure to turn off recording before attempting to use any mocks in your tests.

### `dont_print` option

If you just want to capture the generated code into a var as an array you can use:

```js
nock.recorder.rec({
  dont_print: true,
})
// ... some HTTP calls
const nockCalls = nock.recorder.play()
```

The `nockCalls` var will contain an array of strings representing the generated code you need.

Copy and paste that code into your tests, customize at will, and you're done! You can call `nock.recorder.clear()` to remove already recorded calls from the array that `nock.recorder.play()` returns.

(Remember that you should do this one test at a time).

### `output_objects` option

In case you want to generate the code yourself or use the test data in some other way, you can pass the `output_objects` option to `rec`:

```js
nock.recorder.rec({
  output_objects: true,
})
// ... some HTTP calls
const nockCallObjects = nock.recorder.play()
```

The returned call objects have the following properties:

- `scope` - the scope of the call including the protocol and non-standard ports (e.g. `'https://github.com:12345'`)
- `method` - the HTTP verb of the call (e.g. `'GET'`)
- `path` - the path of the call (e.g. `'/pgte/nock'`)
- `body` - the body of the call, if any
- `status` - the HTTP status of the reply (e.g. `200`)
- `response` - the body of the reply which can be a JSON, string, hex string representing binary buffers or an array of such hex strings (when handling `content-encoded` in reply header)
- `rawHeaders` - the headers of the reply which are formatted as a flat array containing header name and header value pairs (e.g. `['accept', 'application/json', 'set-cookie', 'my-cookie=value']`)
- `reqheader` - the headers of the request

If you save this as a JSON file, you can load them directly through `nock.load(path)`. Then you can post-process them before using them in the tests. For example, to add request body filtering (shown here fixing timestamps to match the ones captured during recording):

```js
nocks = nock.load(pathToJson)
nocks.forEach(function (nock) {
  nock.filteringRequestBody = (body, aRecordedBody) => {
    if (typeof body !== 'string' || typeof aRecordedBody !== 'string') {
      return body
    }

    const recordedBodyResult = /timestamp:([0-9]+)/.exec(aRecordedBody)
    if (recordedBodyResult) {
      const recordedTimestamp = recordedBodyResult[1]
      return body.replace(
        /(timestamp):([0-9]+)/g,
        function (match, key, value) {
          return key + ':' + recordedTimestamp
        },
      )
    } else {
      return body
    }
  }
})
```

Alternatively, if you need to pre-process the captured nock definitions before
using them (e.g. to add scope filtering) then you can use `nock.loadDefs(path)`
and `nock.define(nockDefs)`. Shown here is scope filtering for Dropbox node
module which constantly changes the subdomain to which it sends the requests:

```js
//  Pre-process the nock definitions as scope filtering has to be defined before the nocks are defined (due to its very hacky nature).
const nockDefs = nock.loadDefs(pathToJson)
nockDefs.forEach(def => {
  //  Do something with the definition object e.g. scope filtering.
  def.options = {
    ...def.options,
    filteringScope: scope => /^https:\/\/api[0-9]*.dropbox.com/.test(scope),
  }
})

//  Load the nocks from pre-processed definitions.
const nocks = nock.define(nockDefs)
```

### `enable_reqheaders_recording` option

Recording request headers by default is deemed more trouble than it's worth as some of them depend on the timestamp or other values that may change after the tests have been recorded thus leading to complex postprocessing of recorded tests. Thus by default the request headers are not recorded.

The genuine use cases for recording request headers (e.g. checking authorization) can be handled manually or by using `enable_reqheaders_recording` in `recorder.rec()` options.

```js
nock.recorder.rec({
  dont_print: true,
  output_objects: true,
  enable_reqheaders_recording: true,
})
```

Note that even when request headers recording is enabled Nock will never record `user-agent` headers. `user-agent` values change with the version of Node and underlying operating system and are thus useless for matching as all that they can indicate is that the user agent isn't the one that was used to record the tests.

### `logging` option

Nock will print using `console.log` by default (assuming that `dont_print` is `false`). If a different function is passed into `logging`, nock will send the log string (or object, when using `output_objects`) to that function. Here's a basic example.

```js
const appendLogToFile = content => {
  fs.appendFile('record.txt', content)
}
nock.recorder.rec({
  logging: appendLogToFile,
})
```

### `use_separator` option

By default, nock will wrap its output with the separator string `<<<<<<-- cut here -->>>>>>` before and after anything it prints, whether to the console or a custom log function given with the `logging` option.

To disable this, set `use_separator` to false.

```js
nock.recorder.rec({
  use_separator: false,
})
```

### .removeInterceptor()

This allows removing a specific interceptor. This can be either an interceptor instance or options for a url. It's useful when there's a list of common interceptors shared between tests, where an individual test requires one of the shared interceptors to behave differently.

Examples:

```js
nock.removeInterceptor({
  hostname: 'localhost',
  path: '/mockedResource',
})
```

```js
nock.removeInterceptor({
  hostname: 'localhost',
  path: '/login',
  method: 'POST',
  proto: 'https',
})
```

```js
const interceptor = nock('http://example.org').get('somePath')
nock.removeInterceptor(interceptor)
```

**Note** `.reply(...)` method returns Scope, not Interceptor, and so it is not a valid argument for `nock.removeInterceptor`. So if your method chain ends with `.reply` to be used with `nock.removeInterceptor` the chain need to be break in between:

```js
// this will NOT work
const interceptor = nock('http://example.org').get('somePath').reply(200, 'OK')
nock.removeInterceptor(interceptor)
// this is how it should be
const interceptor = nock('http://example.org').get('somePath')
interceptor.reply(200, 'OK')
nock.removeInterceptor(interceptor)
```

## Events

A scope emits the following events:

- `emit('request', function(req, interceptor, body))`
- `emit('replied', function(req, interceptor))`

### Global no match event

You can also listen for no match events like this:

```js
nock.emitter.on('no match', req => {})
```

## Nock Back

Fixture recording support and playback.

### Setup

You must specify a fixture directory before using, for example:

In your test helper

```js
const nockBack = require('nock').back

nockBack.fixtures = '/path/to/fixtures/'
nockBack.setMode('record')
```

#### Options

- `nockBack.fixtures` : path to fixture directory
- `nockBack.setMode()` : the mode to use

### Usage

By default if the fixture doesn't exist, a `nockBack` will create a new fixture and save the recorded output
for you. The next time you run the test, if the fixture exists, it will be loaded in.

The `this` context of the callback function will have a property `scopes` to access all of the loaded
nock scopes.

```js
const nockBack = require('nock').back
const request = require('request')
nockBack.setMode('record')

nockBack.fixtures = __dirname + '/nockFixtures' //this only needs to be set once in your test helper

// recording of the fixture
nockBack('zomboFixture.json', nockDone => {
  request.get('http://zombo.com', (err, res, body) => {
    nockDone()

    // usage of the created fixture
    nockBack('zomboFixture.json', function (nockDone) {
      http.get('http://zombo.com/').end() // respond body "Ok"

      this.assertScopesFinished() //throws an exception if all nocks in fixture were not satisfied
      http.get('http://zombo.com/').end() // throws exception because someFixture.json only had one call

      nockDone() //never gets here
    })
  })
})
```

If your tests are using promises then use `nockBack` like this:

```js
return nockBack('promisedFixture.json').then(({ nockDone, context }) => {
  //  do your tests returning a promise and chain it with
  //  `.then(nockDone)`
})
```

Or, with async/await:

```js
const { nockDone, context } = await nockBack('promisedFixture.json')
//  your test code
nockDone()
```

#### Options

As an optional second parameter you can pass the following options

- `before`: a preprocessing function, gets called before nock.define
- `after`: a postprocessing function, gets called after nock.define
- `afterRecord`: a postprocessing function, gets called after recording. Is passed the array of scopes recorded and should return the intact array, a modified version of the array, or if custom formatting is desired, a stringified version of the array to save to the fixture
- `recorder`: custom options to pass to the recorder

##### Example

```js
function prepareScope(scope) {
  scope.filteringRequestBody = (body, aRecordedBody) => {
    if (typeof body !== 'string' || typeof aRecordedBody !== 'string') {
      return body
    }

    const recordedBodyResult = /timestamp:([0-9]+)/.exec(aRecordedBody)
    if (recordedBodyResult) {
      const recordedTimestamp = recordedBodyResult[1]
      return body.replace(
        /(timestamp):([0-9]+)/g,
        (match, key, value) => `${key}:${recordedTimestamp}`,
      )
    } else {
      return body
    }
  }
}

nockBack('exampleFixture.json', { before: prepareScope }, nockDone => {
  request.get('http://example.com', function (err, res, body) {
    // do your tests
    nockDone()
  })
})
```

### Modes

To set the mode call `nockBack.setMode(mode)` or run the tests with the `NOCK_BACK_MODE` environment variable set before loading nock. If the mode needs to be changed programmatically, the following is valid: `nockBack.setMode(nockBack.currentMode)`

- wild: all requests go out to the internet, don't replay anything, doesn't record anything

- dryrun: The default, use recorded nocks, allow http calls, doesn't record anything, useful for writing new tests

- record: use recorded nocks, record new nocks

- update: remove recorded nocks, record nocks

- lockdown: use recorded nocks, disables all http calls even when not nocked, doesn't record

### Verifying recorded fixtures

Although you can certainly open the recorded JSON fixtures to manually verify requests recorded by nockBack - it's sometimes useful to put those expectations in your tests.

The `context.query` function can be used to return all of the interceptors that were recored in a given fixture.

By itself, this functions as a negative expectation - you can verify that certain calls do NOT happen in the fixture. Since `assertScopesFinished` can verify there are no _extra_ calls in a fixture - pairing the two methods allows you to verify the exact set of HTTP interactions recorded in the fixture. This is especially useful when re-recording for instance, a service that synchronizes via several HTTP calls to an external API.

**NB**: The list of fixtures is only available when reading. It will only be populated for nocks that are played back from fixtures.

#### Example

```js
it('#synchronize - synchronize with the external API', async localState => {
  const { nockDone, context } = await back('http-interaction.json')

  const syncronizer = new Synchronizer(localState)

  sycnronizer.syncronize()

  nockDone()

  context.assertScopesFinished()

  expect(context.query()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: 'POST',
        path: '/create/thing',
      }),
      expect.objectContaining({
        method: 'POST',
        path: 'create/thing',
      }),
    ]),
  )
})
```

## Common issues

**"No match for response" when using got with error responses**

[Got][] automatically retries failed requests twice. That means if you have a
test which mocks a 4xx or 5xx response, got will immediately reissue it. At
that point, the mock will have been consumed and the second request will error
out with **Nock: No match for request**.

The same is true for `.replyWithError()`.

Adding `{ retry: 0 }` to the `got` invocations will disable retrying, e.g.:

```js
await got('http://example.test/', { retry: 0 })
```

If you need to do this in all your tests, you can create a module
`got_client.js` which exports a custom got instance:

```js
const got = require('got')

module.exports = got.extend({ retry: 0 })
```

This is how it's handled in Nock itself (see [#1523][]).

[got]: https://github.com/sindresorhus/got
[#1523]: https://github.com/nock/nock/issues/1523

### Axios

To use Nock with [Axios][], you may need to configure Axios to use the Node
adapter as in the example below:

```js
import axios from 'axios'
import nock from 'nock'
import test from 'ava' // You can use any test framework.

// If you are using jsdom, axios will default to using the XHR adapter which
// can't be intercepted by nock. So, configure axios to use the node adapter.
//
// References:
// https://github.com/axios/axios/pull/5277

axios.defaults.adapter = 'http'

test('can fetch test response', async t => {
  // Set up the mock request.
  const scope = nock('http://localhost')
    .get('/test')
    .reply(200, 'test response')

  // Make the request. Note that the hostname must match exactly what is passed
  // to `nock()`. Alternatively you can set `axios.defaults.host = 'http://localhost'`
  // and run `axios.get('/test')`.
  await axios.get('http://localhost/test')

  // Assert that the expected request was made.
  scope.done()
})
```

For Nock + Axios + Jest to work, you'll have to also adapt your jest.config.js, like so:

```js
const config = {
  moduleNameMapper: {
    // Force CommonJS build for http adapter to be available.
    // via https://github.com/axios/axios/issues/5101#issuecomment-1276572468
    '^axios$': require.resolve('axios'),
  },
}
```

[axios]: https://github.com/axios/axios

### Memory issues with Jest

Memory issues can be avoided by calling [`nock.restore()`](#restoring) after each test suite.  
One of the core principles of [Jest](https://jestjs.io/) is that it runs tests in isolation.
It does this by manipulating the modules cache of Node in a way that conflicts with how Nock monkey patches the builtin `http` and `https` modules.
[Related issue with more details](https://github.com/nock/nock/issues/1817).

## Debugging

Nock uses node internals [`debuglog`](https://nodejs.org/api/util.html#utildebuglogsection-callbackg), so just run with environmental variable `NODE_DEBUG` set to `nock:*`.

```console
user@local$ NODE_DEBUG=nock:* node my_test.js
```

Each step in the matching process is logged this way and can be useful when determining why a request was not intercepted by Nock.

For example the following shows that matching failed because the request had an extra search parameter.

```js
nock('http://example.com').get('/').query({ foo: 'bar' }).reply()

await got('http://example.com/?foo=bar&baz=foz')
```

```console
user@local$ DEBUG=nock:scope:example.com node my_test.js
...
NOCK:SCOPE:EXAMPLE.COM 103514: Interceptor queries: {"foo":"bar"}
NOCK:SCOPE:EXAMPLE.COM 103514:     Request queries: {"foo":"bar","baz":"foz"}
NOCK:SCOPE:EXAMPLE.COM 103514: query matching failed
```

## Contributing

Thanks for wanting to contribute! Take a look at our [Contributing Guide](CONTRIBUTING.md) for notes on our commit message conventions and how to run tests.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/all-contributors/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://pgte.me"><img src="https://avatars1.githubusercontent.com/u/47910?v=4?s=100" width="100px;" alt="Pedro Teixeira"/><br /><sub><b>Pedro Teixeira</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=pgte" title="Code">💻</a> <a href="#maintenance-pgte" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/n30n0v"><img src="https://avatars3.githubusercontent.com/u/10771967?v=4?s=100" width="100px;" alt="n30n0v"/><br /><sub><b>n30n0v</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=n30n0v" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://burntfen.com"><img src="https://avatars3.githubusercontent.com/u/910753?v=4?s=100" width="100px;" alt="Richard Littauer"/><br /><sub><b>Richard Littauer</b></sub></a><br /><a href="#maintenance-RichardLitt" title="Maintenance">🚧</a> <a href="https://github.com/nock/nock/commits?author=RichardLitt" title="Code">💻</a> <a href="#blog-RichardLitt" title="Blogposts">📝</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://ianwsperber.com"><img src="https://avatars1.githubusercontent.com/u/3731165?v=4?s=100" width="100px;" alt="Ian Walker-Sperber"/><br /><sub><b>Ian Walker-Sperber</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=ianwsperber" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://ilovacha.com"><img src="https://avatars2.githubusercontent.com/u/1505203?v=4?s=100" width="100px;" alt="Ivan Erceg"/><br /><sub><b>Ivan Erceg</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=ierceg" title="Code">💻</a> <a href="#maintenance-ierceg" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/paulmelnikow"><img src="https://avatars2.githubusercontent.com/u/1487036?v=4?s=100" width="100px;" alt="Paul Melnikow"/><br /><sub><b>Paul Melnikow</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=paulmelnikow" title="Code">💻</a> <a href="#maintenance-paulmelnikow" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/gr2m"><img src="https://avatars3.githubusercontent.com/u/39992?v=4?s=100" width="100px;" alt="Gregor Martynus"/><br /><sub><b>Gregor Martynus</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=gr2m" title="Code">💻</a> <a href="#maintenance-gr2m" title="Maintenance">🚧</a> <a href="#business-gr2m" title="Business development">💼</a> <a href="#financial-gr2m" title="Financial">💵</a> <a href="#blog-gr2m" title="Blogposts">📝</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://gitlab.com/hutson"><img src="https://avatars1.githubusercontent.com/u/6701030?v=4?s=100" width="100px;" alt="Hutson Betts"/><br /><sub><b>Hutson Betts</b></sub></a><br /><a href="#financial-hutson" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://lilja.io"><img src="https://avatars2.githubusercontent.com/u/6105119?v=4?s=100" width="100px;" alt="Jonas Lilja"/><br /><sub><b>Jonas Lilja</b></sub></a><br /><a href="#financial-jlilja" title="Financial">💵</a> <a href="https://github.com/nock/nock/commits?author=jlilja" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/benrki"><img src="https://avatars0.githubusercontent.com/u/4446950?v=4?s=100" width="100px;" alt="Benjamin Ki"/><br /><sub><b>Benjamin Ki</b></sub></a><br /><a href="#financial-benrki" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://chadf.ca"><img src="https://avatars2.githubusercontent.com/u/3250463?v=4?s=100" width="100px;" alt="Chad Fawcett"/><br /><sub><b>Chad Fawcett</b></sub></a><br /><a href="#financial-chadfawcett" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.laurencemyers.com.au"><img src="https://avatars.githubusercontent.com/u/6336048?v=4?s=100" width="100px;" alt="Laurence Dougal Myers"/><br /><sub><b>Laurence Dougal Myers</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=laurence-myers" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Beretta1979"><img src="https://avatars.githubusercontent.com/u/10073962?v=4?s=100" width="100px;" alt="Sébastien Van Bruaene"/><br /><sub><b>Sébastien Van Bruaene</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=Beretta1979" title="Code">💻</a> <a href="https://github.com/nock/nock/commits?author=Beretta1979" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Uzlopak"><img src="https://avatars.githubusercontent.com/u/5059100?v=4?s=100" width="100px;" alt="Aras Abbasi"/><br /><sub><b>Aras Abbasi</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=Uzlopak" title="Code">💻</a> <a href="https://github.com/nock/nock/commits?author=Uzlopak" title="Tests">⚠️</a> <a href="#maintenance-Uzlopak" title="Maintenance">🚧</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rsaryev"><img src="https://avatars.githubusercontent.com/u/70219513?v=4?s=100" width="100px;" alt="Saryev Rustam"/><br /><sub><b>Saryev Rustam</b></sub></a><br /><a href="https://github.com/nock/nock/commits?author=rsaryev" title="Code">💻</a> <a href="https://github.com/nock/nock/commits?author=rsaryev" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mikicho"><img src="https://avatars.githubusercontent.com/u/11459632?v=4?s=100" width="100px;" alt="Michael Solomon"/><br /><sub><b>Michael Solomon</b></sub></a><br /><a href="#maintenance-mikicho" title="Maintenance">🚧</a> <a href="https://github.com/nock/nock/commits?author=mikicho" title="Code">💻</a> <a href="https://github.com/nock/nock/commits?author=mikicho" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/nock#sponsor)]

<a href="https://opencollective.com/nock/sponsor/0/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/1/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/2/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/3/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/4/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/5/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/6/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/7/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/8/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/nock/sponsor/9/website" target="_blank"><img src="https://opencollective.com/nock/sponsor/9/avatar.svg"></a>

## License

[MIT](LICENSE)

Copyright (c) 2011–2019 [Pedro Teixeira](http://about.me/pedroteixeira) and other [contributors](https://github.com/nock/nock/graphs/contributors).
