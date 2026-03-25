# stream-http [![Build Status](https://travis-ci.org/jhiesey/stream-http.svg?branch=master)](https://travis-ci.org/jhiesey/stream-http)

[![Sauce Test Status](https://app.saucelabs.com/browser-matrix/stream-http.svg)](https://app.saucelabs.com/u/stream-http)

This module is an implementation of Node's native `http` module for the browser.
It tries to match Node's API and behavior as closely as possible, but some features
aren't available, since browsers don't give nearly as much control over requests.

This is heavily inspired by, and intended to replace, [http-browserify](https://github.com/substack/http-browserify).

## What does it do?

In accordance with its name, `stream-http` tries to provide data to its caller before
the request has completed whenever possible.

Backpressure, allowing the browser to only pull data from the server as fast as it is
consumed, is supported in:
* Chrome >= 58 (using `fetch` and `WritableStream`)

The following browsers support true streaming, where only a small amount of the request
has to be held in memory at once:
* Chrome >= 43 (using the `fetch` API)
* Firefox >= 9 (using `moz-chunked-arraybuffer` responseType with xhr)

All other supported browsers support pseudo-streaming, where the data is available before
the request finishes, but the entire response must be held in memory. This works for both
text and binary data.

### IE note:
As of version 3.0.0, IE10 and below are no longer supported. IE11 support will remain for
now.

## How do you use it?

The intent is to have the same API as the client part of the
[Node HTTP module](https://nodejs.org/api/http.html). The interfaces are the same wherever
practical, although limitations in browsers make an exact clone of the Node API impossible.

This module implements `http.request`, `http.get`, and most of `http.ClientRequest`
and `http.IncomingMessage` in addition to `http.METHODS` and `http.STATUS_CODES`. See the
Node docs for how these work.

### Extra features compared to Node

* The `message.url` property provides access to the final URL after all redirects. This
is useful since the browser follows all redirects silently, unlike Node. It is available
in Chrome 37 and newer, Firefox 32 and newer, and Safari 9 and newer.

* The `options.withCredentials` boolean flag, used to indicate if the browser should send
cookies or authentication information with a CORS request. Default false.

This module has to make some tradeoffs to support binary data and/or streaming. Generally,
the module can make a fairly good decision about which underlying browser features to use,
but sometimes it helps to get a little input from the developer.

* The `options.mode` field passed into `http.request` or `http.get` can take on one of the
following values:
  * 'default' (or any falsy value, including `undefined`): Try to provide partial data before
the request completes, but not at the cost of correctness for binary data or correctness of
the 'content-type' response header. This mode will also avoid slower code paths whenever
possible, which is particularly useful when making large requests in a browser like Safari
that has a weaker JavaScript engine.
  * 'allow-wrong-content-type': Provides partial data in more cases than 'default', but
at the expense of causing the 'content-type' response header to be incorrectly reported
(as 'text/plain; charset=x-user-defined') in some browsers, notably Safari and Chrome 42
and older. Preserves binary data whenever possible. In some cases the implementation may
also be a bit slow. This was the default in versions of this module before 1.5.
  * 'prefer-streaming': Provide data before the request completes even if binary data (anything
that isn't a single-byte ASCII or UTF8 character) will be corrupted. Of course, this option
is only safe for text data. May also cause the 'content-type' response header to be
incorrectly reported (as 'text/plain; charset=x-user-defined').
  * 'disable-fetch': Force the use of plain XHR regardless of the browser declaring a fetch
capability. Preserves the correctness of binary data and the 'content-type' response header.
  * 'prefer-fast': Deprecated; now a synonym for 'default', which has the same performance
characteristics as this mode did in versions before 1.5.

* `options.requestTimeout` allows setting a timeout in millisecionds for XHR and fetch (if
supported by the browser). This is a limit on how long the entire process takes from
beginning to end. Note that this is not the same as the node `setTimeout` functions,
which apply to pauses in data transfer over the underlying socket, or the node `timeout`
option, which applies to opening the connection.

### Features missing compared to Node

* `http.Agent` is only a stub
* The 'socket', 'connect', 'upgrade', and 'continue' events on `http.ClientRequest`.
* Any operations, other than `request.setTimeout`, that operate directly on the underlying
socket.
* Any options that are disallowed for security reasons. This includes setting or getting
certain headers.
* `message.httpVersion`
* `message.rawHeaders` is modified by the browser, and may not quite match what is sent by
the server.
* `message.trailers` and `message.rawTrailers` will remain empty.
* Redirects are followed silently by the browser, so it isn't possible to access the 301/302
redirect pages.

## Example

``` js
http.get('/bundle.js', function (res) {
	var div = document.getElementById('result');
	div.innerHTML += 'GET /beep<br>';

	res.on('data', function (buf) {
		div.innerHTML += buf;
	});

	res.on('end', function () {
		div.innerHTML += '<br>__END__';
	});
})
```

## Running tests

There are two sets of tests: the tests that run in Node (found in `test/node`) and the tests
that run in the browser (found in `test/browser`). Normally the browser tests run on
[Sauce Labs](http://saucelabs.com/).

Running `npm test` will run both sets of tests, but in order for the Sauce Labs tests to run
you will need to sign up for an account (free for open source projects) and put the
credentials in a [`.airtaprc` file](https://github.com/airtap/airtap/blob/master/doc/airtaprc.md).
You will also need to run a [Sauce Connect Proxy](https://wiki.saucelabs.com/display/DOCS/Sauce+Connect+Proxy)
with the same credentials.

To run just the Node tests, run `npm run test-node`.

To run the browser tests locally, run `npm run test-browser-local` and point your browser to
the link shown in your terminal.

## License

MIT. Copyright (C) John Hiesey and other contributors.
