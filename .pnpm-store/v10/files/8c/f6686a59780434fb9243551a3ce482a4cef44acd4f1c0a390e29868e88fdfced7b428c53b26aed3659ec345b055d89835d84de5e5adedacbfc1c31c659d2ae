# HTTP2 client

[![Greenkeeper badge](https://badges.greenkeeper.io/hisco/http2-client.svg)](https://greenkeeper.io/)

[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]

Drop-in replacement for Nodes http and https that transparently make http request to both http1 / http2 server.
Currently, it's the only http2/https compatible API for clients.

## Motivation
http2 in Node.JS works entirely differently, while in browsers the experience is the same.
`http2-client` was created to enable http2 / http1.1 requests with the same interface as http1.1.

The reason is that many NPM modules cannot upgrade to use http2.0 as these are coupled into http1.1 interface.
With `http2-client` it should be very straight forward.

Meaning you don't need to know which protocol the destination supports before making the request `http2-client` will chose the one that works.

If the Node.js version you are using is not supporting http2 `http2-client` will automatically fallback to http.

## Features
Transparently supports all http protocol.
  * Http/1.1
  * Https/1.1
  * Http/2.0

In case of http1.1
  * Connection pool is managed as usual with an http agent.

In case of http2.0 
  * Connection pool is managed by Http2 agent.
  * Requests to the same "origin" will use the same tcp connection (per request manager) - automatically.
  * All Http2 features are available except push.

## Usage - Same interface
### request()
```js
const {request} = require('http2-client');
const h1Target = 'http://www.example.com/';
const h2Target = 'https://www.example.com/';
const req1 = request(h1Target, (res)=>{
    console.log(`
Url : ${h1Target}
Status : ${res.statusCode}
HttpVersion : ${res.httpVersion}
    `);
});
req1.end();

const req2 = request(h2Target, (res)=>{
    console.log(`
Url : ${h2Target}
Status : ${res.statusCode}
HttpVersion : ${res.httpVersion}
    `);
});
req2.end();
```
### get()
```js
const {get} = require('http2-client');
const h1Target = 'http://www.example.com/';
const h2Target = 'https://www.example.com/';
get(h1Target, (res)=>{
    console.log(`
Url : ${h1Target}
Status : ${res.statusCode}
HttpVersion : ${res.httpVersion}
    `);
});

get(h2Target, (res)=>{
    console.log(`
Url : ${h2Target}
Status : ${res.statusCode}
HttpVersion : ${res.httpVersion}
    `);
});
```

## API
The module mimics the nodejs http module interface of ClientRequest, get() and request().
Same API as regular http/s modules.
Different options will be used depending on the destination this method will get.
  * Http/1.1
  * Https/1.1
  * Http/2.0

### HttpRequestManager
By default this module exports a default request method the will try to detect the currect protocol to use (http2/http1.1/https1.1).
However, you can always create different request manager with your specfic defaults and seperated cache.
* options `<Object>`
    * keepH2ConnectionFor `<number>` Time to keep http2 connection after used last time. Default: 1000ms.
    * keepH1IdentificationCacheFor `<number>` TTL time for identification results of http1.1. Default: 30000ms.
    * useHttp `<boolean>` Should enforce http socket.
    * useHttps `<boolean>` Should enforce https socket.
```js
//Use the default
const {request} = require('http2-client');
//Make a request
const req = request(/*....*/);
req.end();

//Alternatively create a new request
const {HttpRequestManager} = require('http2-client');
const httpRequestManager = new HttpRequestManager();
//Make a request
const req = httpRequestManager.request(/*....*/);
req.end();
``` 

### Http/1.1 - request(options[, callback]) | request(url [,options][, callback]) 
 * options `<Object> | <string> | <URL>`
    * protocol `<string>` Protocol to use. Default: 'http:'.
    * host `<string>` A domain name or IP address of the server to issue the request to. Default:  'localhost'.
    * hostname `<string>` Alias for host. To support url.parse(), hostname is preferred over host.
    * family `<number>` IP address family to use when resolving host and hostname. Valid values are 4 or 6.When unspecified, both IP v4 and v6 will be used.
    * port `<number>` Port of remote server. Default: 80.
    * localAddress `<string>` Local interface to bind for network connections.
    * socketPath `<string>` Unix Domain Socket (use one of host:port or socketPath).
    * method `<string>` A string specifying the HTTP request method. Default: 'GET'.
    * path `<string>` Request path. Should include query string if any. E.G. '/index.html?page=12'. An exception is thrown when the request path contains illegal characters. Currently, only spaces are rejected but that may change in the future. Default: '/'.
    * headers <Object> An object containing request headers.
    * auth `<string>` Basic authentication i.e. 'user:password' to compute an Authorization header.
    * agent `<http.Agent> | <boolean>` Controls Agent behavior. Possible values:
       * undefined (default): use http.globalAgent for this host and port.
       * Agent object: explicitly use the passed in Agent.
       * false: causes a new Agent with default values to be used.
    * createConnection <Function> A function that produces a socket/stream to use for the request when the agent option is not used. This can be used to avoid creating a custom Agent class just to override the default createConnection function. See agent.createConnection() for more details. Any Duplex stream is a valid return value.
    * timeout `<number>` : A number specifying the socket timeout in milliseconds. This will set the timeout before the socket is connected.
    * setHost `<boolean>`: Specifies whether or not to automatically add the Host header. Defaults to true.
  * callback `<Function>`
  * Returns: `<ClientRequest>`

### All http protocols - get(options[, callback]) | get(url [,options][, callback])
  * Differences are per protocol as described in relevant request() and protocol.
  * Same interface as request() with the method always set to GET. Properties that are inherited from the prototype are ignored.
  * Since most requests are GET requests without bodies, Node.js provides this convenience method. The only difference between this method and http.request() is that it sets the method to GET and calls req.end() automatically

### Https/1.1 - request(options[, callback]) | request(url [,options][, callback])
 * options `<Object> | <string> | <URL>` Accepts all options from Http/1.1 , with some differences in default values and aditional tls options:
    * protocol Default: 'https:'
    * port Default: 443
    * agent Default: https.globalAgent
    * rejectUnauthorized `<boolean>` If not false, the server certificate is verified against the list of supplied CAs. An 'error' event is emitted if verification fails; err.code contains the OpenSSL error code. Default: true.
    * ALPNProtocols: `<string[]> | <Buffer[]> | <Uint8Array[]> | <Buffer> | <Uint8Array>` An array of strings, Buffers or Uint8Arrays, or a single Buffer or Uint8Array containing the supported ALPN protocols. Buffers should have the format [len][name][len][name]... e.g. 0x05hello0x05world, where the first byte is the length of the next protocol name. Passing an array is usually much simpler, e.g. ['hello', 'world'].
    * servername: `<string>` Server name for the SNI (Server Name Indication) TLS extension.
    * checkServerIdentity(servername, cert) <Function> A callback function to be used (instead of the builtin tls.checkServerIdentity() function) when checking the server's hostname (or the provided servername when explicitly set) against the certificate. This should return an <Error> if verification fails. The method should return undefined if the servername and cert are verified.
    * session `<Buffer>` A Buffer instance, containing TLS session.
    * minDHSize `<number>` Minimum size of the DH parameter in bits to accept a TLS connection. When a server offers a DH parameter with a size less than minDHSize, the TLS connection is destroyed and an error is thrown. Default: 1024.
    * secureContext: Optional TLS context object created with tls.createSecureContext(). If a secureContext is not provided, one will be created by passing the entire options object to tls.createSecureContext().
    * lookup: `<Function>` Custom lookup function. Default: dns.lookup().
 * callback `<Function>`
 * Returns: `<ClientRequest>`

### Https/2.0 - request(options[, callback]) | request(url [,options][, callback])
 * options `<Object> | <string> | <URL>` Accepts all options from Https/1.1
 * callback `<Function>`
 * Returns: `<ClientRequest>`

## How?
`http2-client` implements 'Application-Layer Protocol Negotiation (ALPN)'.
Which means it first creates TCP connection, after successful ALPN negotiation the supported protocol is known.

If the supported protocol is http2.0 `http2-client` will re-use the same connection.
After the http2.0 connection won't be used for `keepH2ConnectionFor` which defaults to 100 ms, it will be automatically closed.

If the supported protocol is http1.x `http2-client` will only cache the identification result and not the actual socket for `keepH1IdentificationCacheFor` which defaults to 30000 ms.
Any socket configuration is manged by the http agent.
If none is defined the node `globalAgent` will be used. 


## License

  [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/http2-client.svg
[npm-url]: https://npmjs.org/package/http2-client
[travis-image]: https://img.shields.io/travis/hisco/http2-client/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/hisco/http2-client
[snyk-image]: https://snyk.io/test/github/hisco/http2-client/badge.svg?targetFile=package.json
[snyk-url]: https://snyk.io/test/github/hisco/http2-client/badge.svg?targetFile=package.json
