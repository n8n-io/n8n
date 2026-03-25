<p align="center">
  <img src="https://raw.github.com/http-party/node-http-proxy/master/doc/logo.png"/>
</p>

# node-http-proxy [![Build Status](https://travis-ci.org/http-party/node-http-proxy.svg?branch=master)](https://travis-ci.org/http-party/node-http-proxy) [![codecov](https://codecov.io/gh/http-party/node-http-proxy/branch/master/graph/badge.svg)](https://codecov.io/gh/http-party/node-http-proxy)

`node-http-proxy` is an HTTP programmable proxying library that supports
websockets. It is suitable for implementing components such as reverse
proxies and load balancers.

### Table of Contents
  * [Installation](#installation)
  * [Upgrading from 0.8.x ?](#upgrading-from-08x-)
  * [Core Concept](#core-concept)
  * [Use Cases](#use-cases)
    * [Setup a basic stand-alone proxy server](#setup-a-basic-stand-alone-proxy-server)
    * [Setup a stand-alone proxy server with custom server logic](#setup-a-stand-alone-proxy-server-with-custom-server-logic)
    * [Setup a stand-alone proxy server with proxy request header re-writing](#setup-a-stand-alone-proxy-server-with-proxy-request-header-re-writing)
    * [Modify a response from a proxied server](#modify-a-response-from-a-proxied-server)
    * [Setup a stand-alone proxy server with latency](#setup-a-stand-alone-proxy-server-with-latency)
    * [Using HTTPS](#using-https)
    * [Proxying WebSockets](#proxying-websockets)
  * [Options](#options)
  * [Listening for proxy events](#listening-for-proxy-events)
  * [Shutdown](#shutdown)
  * [Miscellaneous](#miscellaneous)
    * [Test](#test)
    * [ProxyTable API](#proxytable-api)
    * [Logo](#logo)
  * [Contributing and Issues](#contributing-and-issues)
  * [License](#license)

### Installation

`npm install http-proxy --save`

**[Back to top](#table-of-contents)**

### Upgrading from 0.8.x ?

Click [here](UPGRADING.md)

**[Back to top](#table-of-contents)**

### Core Concept

A new proxy is created by calling `createProxyServer` and passing
an `options` object as argument ([valid properties are available here](lib/http-proxy.js#L26-L42))

```javascript
var httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer(options); // See (†)
```
†Unless listen(..) is invoked on the object, this does not create a webserver. See below.

An object will be returned with four methods:

* web `req, res, [options]` (used for proxying regular HTTP(S) requests)
* ws `req, socket, head, [options]` (used for proxying WS(S) requests)
* listen `port` (a function that wraps the object in a webserver, for your convenience)
* close `[callback]` (a function that closes the inner webserver and stops listening on given port)

It is then possible to proxy requests by calling these functions

```javascript
http.createServer(function(req, res) {
  proxy.web(req, res, { target: 'http://mytarget.com:8080' });
});
```

Errors can be listened on either using the Event Emitter API

```javascript
proxy.on('error', function(e) {
  ...
});
```

or using the callback API

```javascript
proxy.web(req, res, { target: 'http://mytarget.com:8080' }, function(e) { ... });
```

When a request is proxied it follows two different pipelines ([available here](lib/http-proxy/passes))
which apply transformations to both the `req` and `res` object.
The first pipeline (incoming) is responsible for the creation and manipulation of the stream that connects your client to the target.
The second pipeline (outgoing) is responsible for the creation and manipulation of the stream that, from your target, returns data
to the client.

**[Back to top](#table-of-contents)**

### Use Cases

#### Setup a basic stand-alone proxy server

```js
var http = require('http'),
    httpProxy = require('http-proxy');
//
// Create your proxy server and set the target in the options.
//
httpProxy.createProxyServer({target:'http://localhost:9000'}).listen(8000); // See (†)

//
// Create your target server
//
http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('request successfully proxied!' + '\n' + JSON.stringify(req.headers, true, 2));
  res.end();
}).listen(9000);
```
†Invoking listen(..) triggers the creation of a web server. Otherwise, just the proxy instance is created.

**[Back to top](#table-of-contents)**

#### Setup a stand-alone proxy server with custom server logic
This example shows how you can proxy a request using your own HTTP server
and also you can put your own logic to handle the request.

```js
var http = require('http'),
    httpProxy = require('http-proxy');

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({});

//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  proxy.web(req, res, { target: 'http://127.0.0.1:5050' });
});

console.log("listening on port 5050")
server.listen(5050);
```

**[Back to top](#table-of-contents)**

#### Setup a stand-alone proxy server with proxy request header re-writing
This example shows how you can proxy a request using your own HTTP server that
modifies the outgoing proxy request by adding a special header.

```js
var http = require('http'),
    httpProxy = require('http-proxy');

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({});

// To modify the proxy connection before data is sent, you can listen
// for the 'proxyReq' event. When the event is fired, you will receive
// the following arguments:
// (http.ClientRequest proxyReq, http.IncomingMessage req,
//  http.ServerResponse res, Object options). This mechanism is useful when
// you need to modify the proxy request before the proxy connection
// is made to the target.
//
proxy.on('proxyReq', function(proxyReq, req, res, options) {
  proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
});

var server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  proxy.web(req, res, {
    target: 'http://127.0.0.1:5050'
  });
});

console.log("listening on port 5050")
server.listen(5050);
```

**[Back to top](#table-of-contents)**

#### Modify a response from a proxied server
Sometimes when you have received a HTML/XML document from the server of origin you would like to modify it before forwarding it on.

[Harmon](https://github.com/No9/harmon) allows you to do this in a streaming style so as to keep the pressure on the proxy to a minimum.

**[Back to top](#table-of-contents)**

#### Setup a stand-alone proxy server with latency

```js
var http = require('http'),
    httpProxy = require('http-proxy');

//
// Create a proxy server with latency
//
var proxy = httpProxy.createProxyServer();

//
// Create your server that makes an operation that waits a while
// and then proxies the request
//
http.createServer(function (req, res) {
  // This simulates an operation that takes 500ms to execute
  setTimeout(function () {
    proxy.web(req, res, {
      target: 'http://localhost:9008'
    });
  }, 500);
}).listen(8008);

//
// Create your target server
//
http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('request successfully proxied to: ' + req.url + '\n' + JSON.stringify(req.headers, true, 2));
  res.end();
}).listen(9008);
```

**[Back to top](#table-of-contents)**

#### Using HTTPS
You can activate the validation of a secure SSL certificate to the target connection (avoid self-signed certs), just set `secure: true` in the options.

##### HTTPS -> HTTP

```js
//
// Create the HTTPS proxy server in front of a HTTP server
//
httpProxy.createServer({
  target: {
    host: 'localhost',
    port: 9009
  },
  ssl: {
    key: fs.readFileSync('valid-ssl-key.pem', 'utf8'),
    cert: fs.readFileSync('valid-ssl-cert.pem', 'utf8')
  }
}).listen(8009);
```

##### HTTPS -> HTTPS

```js
//
// Create the proxy server listening on port 443
//
httpProxy.createServer({
  ssl: {
    key: fs.readFileSync('valid-ssl-key.pem', 'utf8'),
    cert: fs.readFileSync('valid-ssl-cert.pem', 'utf8')
  },
  target: 'https://localhost:9010',
  secure: true // Depends on your needs, could be false.
}).listen(443);
```

##### HTTP -> HTTPS (using a PKCS12 client certificate)

```js
//
// Create an HTTP proxy server with an HTTPS target
//
httpProxy.createProxyServer({
  target: {
    protocol: 'https:',
    host: 'my-domain-name',
    port: 443,
    pfx: fs.readFileSync('path/to/certificate.p12'),
    passphrase: 'password',
  },
  changeOrigin: true,
}).listen(8000);
```

**[Back to top](#table-of-contents)**

#### Proxying WebSockets
You can activate the websocket support for the proxy using `ws:true` in the options.

```js
//
// Create a proxy server for websockets
//
httpProxy.createServer({
  target: 'ws://localhost:9014',
  ws: true
}).listen(8014);
```

Also you can proxy the websocket requests just calling the `ws(req, socket, head)` method.

```js
//
// Setup our server to proxy standard HTTP requests
//
var proxy = new httpProxy.createProxyServer({
  target: {
    host: 'localhost',
    port: 9015
  }
});
var proxyServer = http.createServer(function (req, res) {
  proxy.web(req, res);
});

//
// Listen to the `upgrade` event and proxy the
// WebSocket requests as well.
//
proxyServer.on('upgrade', function (req, socket, head) {
  proxy.ws(req, socket, head);
});

proxyServer.listen(8015);
```

**[Back to top](#table-of-contents)**

### Options

`httpProxy.createProxyServer` supports the following options:

*  **target**: url string to be parsed with the url module
*  **forward**: url string to be parsed with the url module
*  **agent**: object to be passed to http(s).request (see Node's [https agent](http://nodejs.org/api/https.html#https_class_https_agent) and [http agent](http://nodejs.org/api/http.html#http_class_http_agent) objects)
*  **ssl**: object to be passed to https.createServer()
*  **ws**: true/false, if you want to proxy websockets
*  **xfwd**: true/false, adds x-forward headers
*  **secure**: true/false, if you want to verify the SSL Certs
*  **toProxy**: true/false, passes the absolute URL as the `path` (useful for proxying to proxies)
*  **prependPath**: true/false, Default: true - specify whether you want to prepend the target's path to the proxy path
*  **ignorePath**: true/false, Default: false - specify whether you want to ignore the proxy path of the incoming request (note: you will have to append / manually if required).
*  **localAddress**: Local interface string to bind for outgoing connections
*  **changeOrigin**: true/false, Default: false - changes the origin of the host header to the target URL
*  **preserveHeaderKeyCase**: true/false, Default: false - specify whether you want to keep letter case of response header key
*  **auth**: Basic authentication i.e. 'user:password' to compute an Authorization header.
*  **hostRewrite**: rewrites the location hostname on (201/301/302/307/308) redirects.
*  **autoRewrite**: rewrites the location host/port on (201/301/302/307/308) redirects based on requested host/port. Default: false.
*  **protocolRewrite**: rewrites the location protocol on (201/301/302/307/308) redirects to 'http' or 'https'. Default: null.
*  **cookieDomainRewrite**: rewrites domain of `set-cookie` headers. Possible values:
   * `false` (default): disable cookie rewriting
   * String: new domain, for example `cookieDomainRewrite: "new.domain"`. To remove the domain, use `cookieDomainRewrite: ""`.
   * Object: mapping of domains to new domains, use `"*"` to match all domains.
     For example keep one domain unchanged, rewrite one domain and remove other domains:
     ```
     cookieDomainRewrite: {
       "unchanged.domain": "unchanged.domain",
       "old.domain": "new.domain",
       "*": ""
     }
     ```
*  **cookiePathRewrite**: rewrites path of `set-cookie` headers. Possible values:
   * `false` (default): disable cookie rewriting
   * String: new path, for example `cookiePathRewrite: "/newPath/"`. To remove the path, use `cookiePathRewrite: ""`. To set path to root use `cookiePathRewrite: "/"`.
   * Object: mapping of paths to new paths, use `"*"` to match all paths.
     For example, to keep one path unchanged, rewrite one path and remove other paths:
     ```
     cookiePathRewrite: {
       "/unchanged.path/": "/unchanged.path/",
       "/old.path/": "/new.path/",
       "*": ""
     }
     ```
*  **headers**: object with extra headers to be added to target requests.
*  **proxyTimeout**: timeout (in millis) for outgoing proxy requests
*  **timeout**: timeout (in millis) for incoming requests
*  **followRedirects**: true/false, Default: false - specify whether you want to follow redirects
*  **selfHandleResponse** true/false, if set to true, none of the webOutgoing passes are called and it's your responsibility to appropriately return the response by listening and acting on the `proxyRes` event
*  **buffer**: stream of data to send as the request body.  Maybe you have some middleware that consumes the request stream before proxying it on e.g.  If you read the body of a request into a field called 'req.rawbody' you could restream this field in the buffer option:

    ```
    'use strict';

    const streamify = require('stream-array');
    const HttpProxy = require('http-proxy');
    const proxy = new HttpProxy();

    module.exports = (req, res, next) => {

      proxy.web(req, res, {
        target: 'http://localhost:4003/',
        buffer: streamify(req.rawBody)
      }, next);

    };
    ```

**NOTE:**
`options.ws` and `options.ssl` are optional.
`options.target` and `options.forward` cannot both be missing

If you are using the `proxyServer.listen` method, the following options are also applicable:

 *  **ssl**: object to be passed to https.createServer()
 *  **ws**: true/false, if you want to proxy websockets


**[Back to top](#table-of-contents)**

### Listening for proxy events

* `error`: The error event is emitted if the request to the target fail. **We do not do any error handling of messages passed between client and proxy, and messages passed between proxy and target, so it is recommended that you listen on errors and handle them.**
* `proxyReq`: This event is emitted before the data is sent. It gives you a chance to alter the proxyReq request object. Applies to "web" connections
* `proxyReqWs`: This event is emitted before the data is sent. It gives you a chance to alter the proxyReq request object. Applies to "websocket" connections
* `proxyRes`: This event is emitted if the request to the target got a response.
* `open`: This event is emitted once the proxy websocket was created and piped into the target websocket.
* `close`: This event is emitted once the proxy websocket was closed.
* (DEPRECATED) `proxySocket`: Deprecated in favor of `open`.

```js
var httpProxy = require('http-proxy');
// Error example
//
// Http Proxy Server with bad target
//
var proxy = httpProxy.createServer({
  target:'http://localhost:9005'
});

proxy.listen(8005);

//
// Listen for the `error` event on `proxy`.
proxy.on('error', function (err, req, res) {
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });

  res.end('Something went wrong. And we are reporting a custom error message.');
});

//
// Listen for the `proxyRes` event on `proxy`.
//
proxy.on('proxyRes', function (proxyRes, req, res) {
  console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
});

//
// Listen for the `open` event on `proxy`.
//
proxy.on('open', function (proxySocket) {
  // listen for messages coming FROM the target here
  proxySocket.on('data', hybiParseAndLogMessage);
});

//
// Listen for the `close` event on `proxy`.
//
proxy.on('close', function (res, socket, head) {
  // view disconnected websocket connections
  console.log('Client disconnected');
});
```

**[Back to top](#table-of-contents)**

### Shutdown

* When testing or running server within another program it may be necessary to close the proxy.
* This will stop the proxy from accepting new connections.

```js
var proxy = new httpProxy.createProxyServer({
  target: {
    host: 'localhost',
    port: 1337
  }
});

proxy.close();
```

**[Back to top](#table-of-contents)**

### Miscellaneous

If you want to handle your own response after receiving the `proxyRes`, you can do
so with `selfHandleResponse`. As you can see below, if you use this option, you
are able to intercept and read the `proxyRes` but you must also make sure to
reply to the `res` itself otherwise the original client will never receive any
data.

### Modify response

```js

    var option = {
      target: target,
      selfHandleResponse : true
    };
    proxy.on('proxyRes', function (proxyRes, req, res) {
        var body = [];
        proxyRes.on('data', function (chunk) {
            body.push(chunk);
        });
        proxyRes.on('end', function () {
            body = Buffer.concat(body).toString();
            console.log("res from proxied server:", body);
            res.end("my response to cli");
        });
    });
    proxy.web(req, res, option);


```

#### ProxyTable API

A proxy table API is available through this add-on [module](https://github.com/donasaur/http-proxy-rules), which lets you define a set of rules to translate matching routes to target routes that the reverse proxy will talk to.

#### Test

```
$ npm test
```

#### Logo

Logo created by [Diego Pasquali](http://dribbble.com/diegopq)

**[Back to top](#table-of-contents)**

### Contributing and Issues

* Read carefully our [Code Of Conduct](https://github.com/http-party/node-http-proxy/blob/master/CODE_OF_CONDUCT.md)
* Search on Google/Github
* If you can't find anything, open an issue
* If you feel comfortable about fixing the issue, fork the repo
* Commit to your local branch (which must be different from `master`)
* Submit your Pull Request (be sure to include tests and update documentation)

**[Back to top](#table-of-contents)**

### License

>The MIT License (MIT)
>
>Copyright (c) 2010 - 2016 Charlie Robbins, Jarrett Cruger & the Contributors.
>
>Permission is hereby granted, free of charge, to any person obtaining a copy
>of this software and associated documentation files (the "Software"), to deal
>in the Software without restriction, including without limitation the rights
>to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
>copies of the Software, and to permit persons to whom the Software is
>furnished to do so, subject to the following conditions:
>
>The above copyright notice and this permission notice shall be included in
>all copies or substantial portions of the Software.
>
>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
>IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
>FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
>AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
>LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
>OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
>THE SOFTWARE.
