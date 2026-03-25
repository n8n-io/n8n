# FakeXMLHttpRequest [![Build Status](https://travis-ci.org/pretenderjs/FakeXMLHttpRequest.png?branch=master)](https://travis-ci.org/pretenderjs/FakeXMLHttpRequest)

This library provide a fake XMLHttpRequest object for testing browser-based
libraries. It is partially extracted (and in many places simplified) from
[Sinon.JS](http://sinonjs.org/) and attempts to match the behavior of
[XMLHttpRequest specification](http://www.w3.org/TR/XMLHttpRequest/).

## Why not just use Sinon.JS?
Sinon includes much more than _just_ a fake XHR object which is useful in
situations where you may not need mocks, spies, stubs, or fake servers.

## How to use it
In addition to matching the native XMLHttpRequest's API, FakeXMLHttpRequest
adds a `respond` function that takes three arguments: a HTTP response status
number, a headers object, and a text response body:

```javascript
// simulate successful response
import FakeXMLHttpRequest from "fake-xml-http-request";

let xhr = new FakeXMLHttpRequest();
xhr.respond(200, {"Content-Type": "application/json"}, '{"key":"value"}');
xhr.status; // 200
xhr.statusText; // "OK"
xhr.responseText; // '{"key":"value"}'

// simulate failed response
xhr = new FakeXMLHttpRequest();
xhr.abort();
```

There is no mechanism for swapping the native XMLHttpRequest or for
recording, finding, or playing back requests. Libraries using FakeXMLHttpRequest
should provide this behavior.

## Testing
Tests are written in [QUnit](http://qunitjs.com/) and run through the
[Karma test runner](http://karma-runner.github.io/0.10/index.html).

Run with:

```
karma start
```


## Code of Conduct

In order to have a more open and welcoming community this project adheres to a [code of conduct](CONDUCT.md) adapted from the [contributor covenant](http://contributor-covenant.org/).

Please adhere to this code of conduct in any interactions you have with this project's community. If you encounter someone violating these terms, please let a maintainer (@trek) know and we will address it as soon as possible.
