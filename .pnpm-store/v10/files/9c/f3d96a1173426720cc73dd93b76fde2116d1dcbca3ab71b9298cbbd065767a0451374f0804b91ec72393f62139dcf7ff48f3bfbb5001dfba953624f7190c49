# Pretender

[![npm version](https://badge.fury.io/js/pretender.svg)](https://badge.fury.io/js/pretender)
[![Build Status](https://travis-ci.org/pretenderjs/pretender.svg)](https://travis-ci.org/pretenderjs/pretender)
[![Coverage Status](https://coveralls.io/repos/pretenderjs/pretender/badge.svg?branch=master&service=github)](https://coveralls.io/github/pretenderjs/pretender?branch=master)
[![Dependency Status](https://david-dm.org/pretenderjs/pretender.svg)](https://david-dm.org/pretenderjs/pretender)
[![devDependency Status](https://david-dm.org/pretenderjs/pretender/dev-status.svg)](https://david-dm.org/pretenderjs/pretender#info=devDependencies)
[![Code Climate](https://codeclimate.com/github/pretenderjs/pretender/badges/gpa.svg)](https://codeclimate.com/github/pretenderjs/pretender)

Pretender is a mock server library for XMLHttpRequest and Fetch, that comes
with an express/sinatra style syntax for defining routes and their handlers.

Pretender will temporarily replace native XMLHttpRequest and Fetch , intercept
all requests, and direct them to little pretend service you've defined.

**:warning: Pretender only works in the browser!**

```javascript
const PHOTOS = {
  "10": {
    id: 10,
    src: 'http://media.giphy.com/media/UdqUo8xvEcvgA/giphy.gif'
  },
  "42": {
    id: 42,
    src: 'http://media0.giphy.com/media/Ko2pyD26RdYRi/giphy.gif'
  }
};

const server = new Pretender(function() {
  this.get('/photos', request => {
    let all =  JSON.stringify(Object.keys(PHOTOS).map(k => PHOTOS[k]));
    return [200, {"Content-Type": "application/json"}, all]
  });

  this.get('/photos/:id', request => {
    return [200, {"Content-Type": "application/json"}, JSON.stringify(PHOTOS[request.params.id])]
  });
});

$.get('/photos/12', {success() => { ... }})
```

## Usage

```
yarn add -D pretender
# or
npm install --save-dev pretender
```

You can load Pretender directly in the browser.

```javascript
<script src="node_modules/pretender/dist/pretender.bundle.js"></script>
```

Or as a module:

```javascript
import Pretender from 'pretender';
const server = new Pretender(function() {});
```

## The Server DSL
The server DSL is inspired by express/sinatra. Pass a function to the Pretender constructor
that will be invoked with the Pretender instance as its context. Available methods are
`get`, `put`, `post`, `delete`, `patch`, and `head`. Each of these methods takes a path pattern,
a callback, and an optional [timing parameter](#timing-parameter). The callback will be invoked with a
single argument (the XMLHttpRequest instance that triggered this request) and must return an array
containing the HTTP status code, headers object, and body as a string.

```javascript
const server = new Pretender(function() {
  this.put('/api/songs/99', request => [404, {}, ""]);
});
```

a Pretender constructor can take multiple maps:

```javascript
import adminMaps from "testing/maps/admin";
import photoMaps from "testing/maps/photos";

const server = new Pretender(photoMaps, adminMaps);
```

```javascript
// testing/maps/photos

const PHOTOS = {
  "58": {
    id: 58,
    src: 'https://media.giphy.com/media/65TpAhHZ7A9nuf3GIu/giphy.gif'
  },
  "99": {
    id: 99,
    src: 'https://media.giphy.com/media/4Zd5qAcFv759xnegdo/giphy.gif'
  }
};

export default function() {
  this.get('/photos/:id', () => 
   [200, {"Content-Type": "application/json"}, JSON.stringify(PHOTOS[request.params.id])]
  );
}
```

The HTTP verb methods can also be called on an instance individually:

```javascript
const server = new Pretender();
server.put('/api/songs/99', request => [404, {}, ""]);
```

### Paths
Paths can either be hard-coded (`this.get('/api/songs/12')`) or contain dynamic segments
(`this.get('/api/songs/:song_id'`). If there were dynamic segments of the path,
these will be attached to the request object as a `params` property with keys matching
the dynamic portion and values with the matching value from the path.

```javascript
const server = new Pretender(function() {
  this.get('/api/songs/:song_id', request => request.params.song_id);
});

$.get('/api/songs/871') // params.song_id will be '871'

```

### Query Parameters
If there were query parameters in the request, these will be attached to the request object as a `queryParams`
property.

```javascript
const server = new Pretender(function() {
  this.get('/api/songs', request => request.queryParams.sortOrder);
});

// typical jQuery-style uses you've probably seen.
// queryParams.sortOrder will be 'asc' for both styles.
$.get({url: '/api/songs', data: { sortOrder: 'asc' }});
$.get('/api/songs?sortOrder=asc');

```


### Responding
You must return an array from this handler that includes the HTTP status code, an object literal
of response headers, and a string body.

```javascript
const server = new Pretender(function() {
  this.get('/api/songs', request => {
    return [
      200,
      {'content-type': 'application/javascript'},
      '[{"id": 12}, {"id": 14}]'
    ];
  });
});
```

Or, optionally, return a Promise.

```javascript
const server = new Pretender(function() {
  this.get('/api/songs', request => {
    return new Promise(resolve => {
      let response = [
        200,
        {'content-type': 'application/javascript'},
        '[{"id": 12}, {"id": 14}]'
      ];

      resolve(response);
    });
  });
});
```

### Pass-Through
You can specify paths that should be ignored by pretender and made as real XHR requests.
Enable these by specifying pass-through routes with `pretender.passthrough`:

```javascript
const server = new Pretender(function() {
  this.get('/photos/:id', this.passthrough);
});
```

In some cases, you will need to force pretender to passthough, just start your server with the `forcePassthrough` option.

```javascript
const server = new Pretender({ forcePassthrough: true })
```

Other times, you may want to decide whether or not to passthrough when the call is made. In that
case you can use the `.passthrough()` function on the fake request itself. (The [`unhandledRequest`
property is discussed below](#unhandled-requests).)

```javascript
server.unhandledRequest = function(verb, path, request) {
  if (myIgnoreRequestChecker(path)) {
    console.warn(`Ignoring request) ${verb.toUpperCase()} : ${path}`);
  } else {
    console.warn(
      `Unhandled ${verb.toUpperCase()} : ${path} >> Passing along. See eventual response below.`
    )
  
    const xhr = request.passthrough(); // <-- A native, sent xhr is returned
  
    xhr.onloadend = (ev) => {
        console.warn(`Response for ${path}`, {
          verb,
          path,
          request,
          responseEvent: ev,
        })
      };
  }
};
```

The `.passthrough()` function will immediately create, send, and return a native `XMLHttpRequest`.

### Timing Parameter
The timing parameter is used to control when a request responds. By default, a request responds
asynchronously on the next frame of the browser's event loop. A request can also be configured to respond
synchronously, after a defined amount of time, or never (i.e., it needs to be manually resolved).

**Default**
```javascript
const server = new Pretender(function() {
  // songHandler will execute the frame after receiving a request (async)
  this.get('/api/songs', songHandler);
});
```

**Synchronous**
```javascript
const server = new Pretender(function() {
  // songHandler will execute immediately after receiving a request (sync)
  this.get('/api/songs', songHandler, false);
});
```

**Delay**
```javascript
const server = new Pretender(function() {
  // songHandler will execute two seconds after receiving a request (async)
  this.get('/api/songs', songHandler, 2000);
});
```

**Manual**
```javascript
const server = new Pretender(function() {
  // songHandler will only execute once you manually resolve the request
  this.get('/api/songs', songHandler, true);
});

// resolve a request like this
server.resolve(theXMLHttpRequestThatRequestedTheSongsRoute);
```

#### Using functions for the timing parameter
You may want the timing behavior of a response to change from request to request. This can be
done by providing a function as the timing parameter.

```javascript
const externalState = 'idle';

function throttler() {
  if (externalState === 'OH NO DDOS ATTACK') {
    return 15000;
  }
}

const server = new Pretender(function() {
  // songHandler will only execute based on the result of throttler
  this.get('/api/songs', songHandler, throttler);
});
```

Now whenever the songs route is requested, its timing behavior will be determined by the result
of the call to `throttler`. When `externalState` is idle, `throttler` returns `undefined`, which
means the route will use the default behavior.

When the time is right, you can set `externalState` to `"OH NO DOS ATTACK"` which will make all
future requests take 15 seconds to respond.

#### Scheduling ProgressEvent
If the timing parameter is resolved as async, then a [`ProgressEvent`](https://xhr.spec.whatwg.org/#interface-progressevent)
will be scheduled every 50ms until the request has a response or is aborted.

To listen to the progress, you can define `onprogress` on the `XMLHttpRequest` object or
its [`upload` attribute](https://xhr.spec.whatwg.org/#the-upload-attribute).

```javascript
let xhr = new window.XMLHttpRequest();
xhr.open('POST', '/uploads');
// https://fetch.spec.whatwg.org/#concept-request-body
// https://xhr.spec.whatwg.org/#the-send()-method
let postBody = new ArrayBuffer(8);
xhr.upload.onprogress = function(event) {
  // event.lengthComputable === true
  // event.total === 8
  // event.loaded will be incremented every ~50ms
};
xhr.onprogress = function(event) {
  // xhr onprogress will also be triggered
};
xhr.send(postBody);
```

## Sharing routes
You can call `map` multiple times on a Pretender instance. This is a great way to share and reuse
sets of routes between tests:

```javascript
export function authenticationRoutes() {
  this.post('/authenticate',() => { ... });
  this.post('/signout', () => { ... });
}

export function songsRoutes() {
  this.get('/api/songs',() => { ... });
}
```


```javascript
// a test

import {authenticationRoutes, songsRoutes} from "../shared/routes";
import Pretender from "pretender";

let p = new Pretender();
p.map(authenticationRoutes);
p.map(songsRoutes);
```

## Hooks
### Handled Requests
In addition to responding to the request, your server will call a `handledRequest` method with
the HTTP `verb`, `path`, and original `request`. By default this method does nothing. You can
override this method to supply your own behavior like logging or test framework integration:

```javascript
const server = new Pretender(function() {
  this.put('/api/songs/:song_id', request => {
    return [202, {"Content-Type": "application/json"}, "{}"]
  });
});

server.handledRequest = function(verb, path, request) {
  console.log("a request was responded to");
}

$.getJSON("/api/songs/12");
```

### Unhandled Requests
Your server will call a `unhandledRequest` method with the HTTP `verb`, `path`, and original `request`,
object if your server receives a request for a route that doesn't have a handler. By default, this method
will throw an error. You can override this method to supply your own behavior:

```javascript
const server = new Pretender(function() {
  // no routes
});

server.unhandledRequest = function(verb, path, request) {
  console.log("what is this I don't even...");
}

$.getJSON("/these/arent/the/droids");
```

### Pass-through Requests
Requests set to be handled by pass-through will trigger the `passthroughRequest` hook:

```javascript
const server = new Pretender(function() {
  this.get('/some/path', this.passthrough);
});

server.passthroughRequest = function(verb, path, request) {
  console.log('request ' + path + ' successfully sent for passthrough');
}
```


### Error Requests
Your server will call a `erroredRequest` method with the HTTP `verb`, `path`, original `request`,
and the original `error` object if your handler code causes an error.

By default, this will augment the error message with some information about which handler caused
the error and then throw the error again. You can override this method to supply your own behavior:

```javascript
const server = new Pretender(function() {
  this.get('/api/songs', request => {
    undefinedWAT("this is no function!");
  });
});

server.erroredRequest = function(verb, path, request, error) {
  SomeTestFramework.failTest();
  console.warn("There was an error", error);
}
```

### Mutating the body
Pretender is response format neutral, so you normally need to supply a string body as the
third part of a response:

```javascript
this.get('/api/songs', request => {
  return [200, {}, "{'id': 12}"];
});
```

This can become tiresome if you know, for example, that all your responses are
going to be JSON. The body of a response will be passed through a
`prepareBody` hook before being passed to the fake response object.
`prepareBody` defaults to an empty function, but can be overridden:

```javascript
const server = new Pretender(function() {
  this.get('/api/songs', request => {
    return [200, {}, {id: 12}];
  });
});

server.prepareBody = function(body){
  return body ? JSON.stringify(body) : '{"error": "not found"}';
}
```

### Mutating the headers
Response headers can be mutated for the entire service instance by implementing a
`prepareHeaders` method:

```javascript
const server = new Pretender(function() {
  this.get('/api/songs', request => {
    return [200, {}, '{"id": 12}'];
  });
});

server.prepareHeaders = function(headers){
  headers['content-type'] = 'application/javascript';
  return headers;
};
```

## Tracking Requests
Your pretender instance will track handlers and requests on a few array properties.
All handlers are stored on `handlers` property and incoming requests will be tracked in one of
three properties: `handledRequests`, `unhandledRequests` and `passthroughRequests`. The handler is also returned from
any verb function. This is useful if you want to build testing infrastructure on top of
pretender and need to fail tests that have handlers without requests.
You can disable tracking requests by passing `trackRequests: false` to pretender options.
```javascript
const server = new Pretender({ trackRequests: false });
```

Each handler keeps a count of the number of requests is successfully served.

```javascript
server.get(/* ... */);
const handler = server.handlers[0];

// or

const handler = server.get(/* ... */);

// then

const numberOfCalls = handler.numberOfCalls;
```

## Clean up
When you're done mocking, be sure to call `shutdown()` to restore the native XMLHttpRequest object:

```javascript
const server = new Pretender(function() {
 ... routing ...
});

server.shutdown(); // all done.
```

# Development of Pretender

## Running tests

* `yarn test` runs tests once
* `yarn test:server` runs and reruns on changes

## Code of Conduct

In order to have a more open and welcoming community this project adheres to a [code of conduct](CONDUCT.md) adapted from the [contributor covenant](http://contributor-covenant.org/).

Please adhere to this code of conduct in any interactions you have with this
project's community. If you encounter someone violating these terms, please let
a maintainer (@trek) know and we will address it as soon as possible.
