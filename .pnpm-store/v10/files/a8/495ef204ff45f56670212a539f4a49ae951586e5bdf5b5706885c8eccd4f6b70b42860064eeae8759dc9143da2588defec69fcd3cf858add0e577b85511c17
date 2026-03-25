|![retry-request](logo.png)
|:-:
|Retry a [request][request] with built-in [exponential backoff](https://developers.google.com/analytics/devguides/reporting/core/v3/coreErrors#backoff).

```sh
$ npm install --save teeny-request
$ npm install --save retry-request
```

```js
var request = require('retry-request', {
  request: require('teeny-request'),
});
```

It should work the same as `request` and `teeny-request` in both callback mode and stream mode.

Note: This module only works when used as a readable stream, i.e. POST requests aren't supported ([#3](https://github.com/stephenplusplus/retry-request/issues/3)).

## Do I need to install `request`?

Yes! You must independently install `teeny-request` OR `request` (_deprecated_) and provide it to this library:

```js
var request = require('retry-request', {
  request: require('teeny-request'),
});
```

#### Callback

`urlThatReturns503` will be requested 3 total times before giving up and executing the callback.

```js
request(urlThatReturns503, function (err, resp, body) {});
```

#### Stream

`urlThatReturns503` will be requested 3 total times before giving up and emitting the `response` and `complete` event as usual.

```js
request(urlThatReturns503)
  .on('error', function () {})
  .on('response', function () {})
  .on('complete', function () {});
```

## Can I monitor what retry-request is doing internally?

Yes! To enable the debug mode, set the environment variable `DEBUG` to _retry-request_.

(Thanks for the implementation, @yihaozhadan!)

## request(requestOptions, [opts], [cb])

### requestOptions

Passed directly to `request` or `teeny-request`. See the list of options supported:

- https://github.com/request/request/#requestoptions-callback
- https://github.com/googleapis/teeny-request#teenyrequestoptions-callback

### opts _(optional)_

#### `opts.noResponseRetries`

Type: `Number`

Default: `2`

The number of times to retry after a response fails to come through, such as a DNS resolution error or a socket hangup.

```js
var opts = {
  noResponseRetries: 0,
};

request(url, opts, function (err, resp, body) {
  // url was requested 1 time before giving up and
  // executing this callback.
});
```

#### `opts.objectMode`

Type: `Boolean`

Default: `false`

Set to `true` if your custom `opts.request` function returns a stream in object mode.

#### `opts.retries`

Type: `Number`

Default: `2`

```js
var opts = {
  retries: 4,
};

request(urlThatReturns503, opts, function (err, resp, body) {
  // urlThatReturns503 was requested a total of 5 times
  // before giving up and executing this callback.
});
```

#### `opts.currentRetryAttempt`

Type: `Number`

Default: `0`

```js
var opts = {
  currentRetryAttempt: 1,
};

request(urlThatReturns503, opts, function (err, resp, body) {
  // urlThatReturns503 was requested as if it already failed once.
});
```

#### `opts.shouldRetryFn`

Type: `Function`

Default: Returns `true` if [http.incomingMessage](https://nodejs.org/api/http.html#http_http_incomingmessage).statusCode is < 200 or >= 400.

```js
var opts = {
  shouldRetryFn: function (incomingHttpMessage) {
    return incomingHttpMessage.statusMessage !== 'OK';
  },
};

request(urlThatReturnsNonOKStatusMessage, opts, function (err, resp, body) {
  // urlThatReturnsNonOKStatusMessage was requested a
  // total of 3 times, each time using `opts.shouldRetryFn`
  // to decide if it should continue before giving up and
  // executing this callback.
});
```

#### `opts.request`

Type: `Function`

If we not provided we will throw an error advising you to provide it.

_NOTE: If you override the request function, and it returns a stream in object mode, be sure to set `opts.objectMode` to `true`._

```js
var originalRequest = require('teeny-request').defaults({
  pool: {
    maxSockets: Infinity,
  },
});

var opts = {
  request: originalRequest,
};

request(urlThatReturns503, opts, function (err, resp, body) {
  // Your provided `originalRequest` instance was used.
});
```

#### `opts.maxRetryDelay`

Type: `Number`

Default: `64`

The maximum time to delay in seconds. If retryDelayMultiplier results in a delay greater than maxRetryDelay, retries should delay by maxRetryDelay seconds instead.

#### `opts.retryDelayMultiplier`

Type: `Number`

Default: `2`

The multiplier by which to increase the delay time between the completion of failed requests, and the initiation of the subsequent retrying request.

#### `opts.totalTimeout`

Type: `Number`

Default: `600`

The length of time to keep retrying in seconds. The last sleep period will be shortened as necessary, so that the last retry runs at deadline (and not considerably beyond it). The total time starting from when the initial request is sent, after which an error will be returned, regardless of the retrying attempts made meanwhile.

### cb _(optional)_

Passed directly to `request`. See the callback section: https://github.com/request/request/#requestoptions-callback.

[request]: https://github.com/request/request
