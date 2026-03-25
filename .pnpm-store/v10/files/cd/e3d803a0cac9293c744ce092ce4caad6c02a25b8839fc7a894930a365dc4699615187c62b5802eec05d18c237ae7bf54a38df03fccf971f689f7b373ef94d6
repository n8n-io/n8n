# simple-websocket [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url]

[travis-image]: https://img.shields.io/travis/feross/simple-websocket/master.svg
[travis-url]: https://travis-ci.org/feross/simple-websocket
[npm-image]: https://img.shields.io/npm/v/simple-websocket.svg
[npm-url]: https://npmjs.org/package/simple-websocket
[downloads-image]: https://img.shields.io/npm/dm/simple-websocket.svg
[downloads-url]: https://npmjs.org/package/simple-websocket
[standard-image]: https://img.shields.io/badge/code_style-standard-brightgreen.svg
[standard-url]: https://standardjs.com

#### Simple, EventEmitter API for WebSockets

[![Sauce Test Status](https://saucelabs.com/browser-matrix/simple-websocket.svg)](https://saucelabs.com/u/simple-websocket)

## features

- **super simple** API for working with WebSockets in the browser
- supports **text and binary data**
- node.js [duplex stream](http://nodejs.org/api/stream.html) interface
- client & server implementations

This package is used by [WebTorrent](https://webtorrent.io).

## install

```
npm install simple-websocket
```

This package works in the browser with [browserify](https://browserify.org). If
you do not use a bundler, you can use the `simplewebsocket.min.js` standalone script
directly in a `<script>` tag. This exports a `SimpleWebsocket` constructor on
`window`. Wherever you see `Socket` in the examples below, substitute that with
`SimpleWebsocket`.

## real-world applications that use simple-websocket

- [Virus Cafe](https://virus.cafe) - Make a friend in 2 minutes
- [WebTorrent](https://webtorrent.io) - The streaming torrent app
- [StudyNotes](http://www.apstudynotes.org) - Helping students learn faster and better
- [bittorrent-tracker](https://github.com/feross/bittorrent-tracker) - Simple, robust, BitTorrent tracker (client & server) implementation
- [instant.io](https://github.com/feross/instant.io) - Secure, anonymous, streaming file transfer
- [lxjs-chat](https://github.com/feross/lxjs-chat) - Omegle chat clone
- [Metastream](https://github.com/samuelmaddock/metastream) - Watch streaming media with friends.
- \[ your application here - send a PR \]

## usage

```js
var Socket = require('simple-websocket')

var socket = new Socket('wss://echo.websocket.org')
socket.on('connect', function () {
  // socket is connected!
  socket.send('sup!')
})

socket.on('data', function (data) {
  console.log('got message: ' + data)
})
```

## api

### `socket = new Socket(url)`

Create a new WebSocket connection to the server at `url`. This usage is a shorthand
for `socket = new Socket({ url: url })`

### `socket = new Socket(opts)`

If `opts.url` is specified as a string, then a WebSocket connection will be created
to the server at `opts.url`.

If `opts.socket` is specified as an instance of a raw WebSocket object, then the
given WebSocket object will be used and one will not be automatically be created
internally. (This is for advanced users.)

Other properties on `opts` will be passed through to the underlying superclass,
`stream.Duplex`.

### `socket.send(data)`

Send text/binary data to the WebSocket server. `data` can be any of several types:
`String`, `Buffer` (see [buffer](https://github.com/feross/buffer)), `TypedArrayView`
(`Uint8Array`, etc.), `ArrayBuffer`, or `Blob` (in browsers that support it).

Note: If this method is called before the `socket.on('connect')` event has fired, then
data will be buffered.

### `socket.destroy([err])`

Destroy and cleanup this websocket connection.

If the optional `err` parameter is passed, then it will be emitted as an `'error'`
event on the stream.

### `Socket.WEBSOCKET_SUPPORT`

Detect WebSocket support in the javascript environment.

```js
var Socket = require('simple-websocket')

if (Socket.WEBSOCKET_SUPPORT) {
  // websocket support!
} else {
  // fallback
}
```

## events

### `socket.on('connect', function () {})`

Fired when the websocket connection is ready to use.

### `socket.on('data', function (data) {})`

Received a message from the websocket server.

`data` will be either a `String` or a `Buffer/Uint8Array` (see [buffer](https://github.com/feross/buffer)).
JSON strings will be parsed and the resulting `Object` emitted.

### `socket.on('close', function () {})`

Called when the websocket connection has closed.

### `socket.on('error', function (err) {})`

`err` is an `Error` object.

Fired when a fatal error occurs.

## server

The server implementation is basically `ws` but the `'connection'` event provides
sockets that are instances of `simple-websocket`, i.e. they are duplex streams.

```js
var Server = require('simple-websocket/server')

var server = new Server({ port: port }) // see `ws` docs for other options

server.on('connection', function (socket) {
  socket.write('pong')
  socket.on('data', function (data) {})
  socket.on('close', function () {})
  socket.on('error', function (err) {})
})

server.close()
```

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
