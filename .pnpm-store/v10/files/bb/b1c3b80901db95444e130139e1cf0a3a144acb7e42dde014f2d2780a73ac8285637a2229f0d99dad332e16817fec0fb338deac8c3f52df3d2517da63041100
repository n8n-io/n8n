Changelog
=========

Version 1.0.35
--------------
*Released 2024-05-12*

* [Updated](https://github.com/theturtle32/WebSocket-Node/pull/455) from [vulnerable version](https://security.snyk.io/vuln/SNYK-JS-ES5EXT-6095076) of es5-ext to a newer version that has been patched. Thanks, [@Tringapps-Dharshan](https://github.com/Tringapps-Dharshan)

Version 1.0.34
--------------
*Released 2021-04-14*

* Updated browser shim to use the native `globalThis` property when available. See [this MDN page](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis) for context. Resolves [#415](https://github.com/theturtle32/WebSocket-Node/issues/415)

Version 1.0.33
--------------
*Released 2020-12-08*

* Added new configuration options to WebSocketServer allowing implementors to bypass parsing WebSocket extensions and HTTP Cookies if they are not needed. (Thanks, [@aetheon](https://github.com/aetheon))
* Added new `upgradeError` event to WebSocketServer to allow for visibility into and logging of any parsing errors that might occur during the HTTP Upgrade phase. (Thanks, [@aetheon](https://github.com/aetheon))

Version 1.0.32
--------------
*Released 2020-08-28*

* Refactor to use [N-API modules](https://nodejs.org/api/n-api.html) from [ws project](https://github.com/websockets). (Thanks, [@andreek](https://github.com/andreek))
  * Specifically:
    * [utf-8-validate](https://github.com/websockets/utf-8-validate)
    * [bufferutil](https://github.com/websockets/bufferutil)
* Removed some documentation notations about very old browsers and very old Websocket protocol drafts that are no longer relevant today in 2020.
* Removed outdated notations and instructions about building native extensions, since those functions are now delegated to dependencies.
* Add automated unit test executionn via Github Actions (Thanks, [@nebojsa94](https://github.com/nebojsa94))
* Accept new connection close code `1015` ("TLS Handshake"). (More information at the [WebSocket Close Code Number Registry](https://www.iana.org/assignments/websocket/websocket.xhtml#close-code-number))

Version 1.0.31
--------------
*Released 2019-12-06*

* Fix [infinite loop in error handling](https://github.com/theturtle32/WebSocket-Node/issues/329) (Thanks, [@apirila](https://github.com/apirila))
* Fix [memory leak with multiple WebSocket servers on the same HTTP server](https://github.com/theturtle32/WebSocket-Node/pull/339) (Thanks, [@nazar-pc](https://github.com/nazar-pc))
* [Use es5-ext/global as a more robust way to resolve browser's window object](https://github.com/theturtle32/WebSocket-Node/pull/362) (Thanks, [@michaelsbradleyjr](https://github.com/michaelsbradleyjr))
* [adding compatibility with V8 release greater than v7.6 (node and electron engines)](https://github.com/theturtle32/WebSocket-Node/pull/376) (Thanks, [@artynet](https://github.com/artynet))

Version 1.0.30
--------------
*Released 2019-09-12*

* Moved gulp back to devDependencies

Version 1.0.29
--------------
*Released 2019-07-03*

* Updated some dependencies and updated the .gitignore and .npmignore files

Version 1.0.28
--------------
*Released 2018-09-19*

* Updated to latest version of [nan](https://github.com/nodejs/nan)

Version 1.0.27
--------------
*Released 2018-09-19*

* Allowing additional request `headers` to be specified in the `tlsOptions` config parameter for WebSocketClient. See pull request #323
* Resolving deprecation warnings relating to usage of `new Buffer`

Version 1.0.26
--------------
*Released 2018-04-27*

* No longer using the deprecated `noAssert` parameter for functions reading and writing binary numeric data. (Thanks, [@BridgeAR](https://github.com/BridgeAR))

Version 1.0.25
--------------
*Released 2017-10-18*

* Bumping minimum supported node version specified in package.json to v0.10.x because some upstream libraries no longer install on v0.8.x
* [Allowing use of close codes 1012, 1013, 1014](https://www.iana.org/assignments/websocket/websocket.xml)
* [Allowing the `Host` header to be overridden.](https://github.com/theturtle32/WebSocket-Node/pull/291) (Thanks, [@Juneil](https://github.com/Juneil))
* [Mitigating infinite loop for broken connections](https://github.com/theturtle32/WebSocket-Node/pull/289) (Thanks, [@tvkit](https://github.com/tvkit))
* [Fixed Markdown Typos](https://github.com/theturtle32/WebSocket-Node/pull/281) (Thanks, [@teramotodaiki](https://github.com/teramotodaiki))
* [Adding old readyState constants for W3CWebSocket interface](https://github.com/theturtle32/WebSocket-Node/pull/282) (Thanks, [@thechriswalker](https://github.com/thechriswalker))


Version 1.0.24
--------------
*Released 2016-12-28*

* Fixed a bug when using native keepalive on Node >= 6.0. (Thanks, [@prossin](https://github.com/prossin))
* Upgrading outdated dependencies

Version 1.0.23
--------------
*Released 2016-05-18*

* Official support for Node 6.x
* Updating dependencies. Specifically, updating nan to ^2.3.3

Version 1.0.22
--------------
*Released 2015-09-28*

* Updating to work with nan 2.x

Version 1.0.21
--------------
*Released 2015-07-22*

* Incremented and re-published to work around an aborted npm publish of v1.0.20.

Version 1.0.20
--------------
*Released 2015-07-22*

* Added EventTarget to the W3CWebSocket interface (Thanks, [@ibc](https://github.com/ibc)!)
* Corrected an inaccurate error message. (Thanks, [@lekoaf](https://github.com/lekoaf)!)

Version 1.0.19
--------------
*Released 2015-05-28*

* Updated to nan v1.8.x (tested with v1.8.4)
* Added `"license": "Apache-2.0"` to package.json via [pull request #199](https://github.com/theturtle32/WebSocket-Node/pull/199) by [@pgilad](https://github.com/pgilad). See [npm1k.org](http://npm1k.org/).


Version 1.0.18
--------------
*Released 2015-03-19*

* Resolves [issue #195](https://github.com/theturtle32/WebSocket-Node/pull/179) - passing number to connection.send() causes crash
* [Added close code/reason arguments to W3CWebSocket#close()](https://github.com/theturtle32/WebSocket-Node/issues/184)


Version 1.0.17
--------------
*Released 2015-01-17*

* Resolves [issue #179](https://github.com/theturtle32/WebSocket-Node/pull/179) - Allow toBuffer to work with empty data


Version 1.0.16
--------------
*Released 2015-01-16*

* Resolves [issue #178](https://github.com/theturtle32/WebSocket-Node/issues/178) - Ping Frames with no data


Version 1.0.15
--------------
*Released 2015-01-13*

* Resolves [issue #177](https://github.com/theturtle32/WebSocket-Node/issues/177) - WebSocketClient ignores options unless it has a tlsOptions property


Version 1.0.14
--------------
*Released 2014-12-03*

* Resolves [issue #173](https://github.com/theturtle32/WebSocket-Node/issues/173) - To allow the W3CWebSocket interface to accept an optional non-standard configuration object as its third parameter, which will be ignored when running in a browser context.


Version 1.0.13
--------------
*Released 2014-11-29*

* Fixes [issue #171](https://github.com/theturtle32/WebSocket-Node/issues/171) - Code to prevent calling req.accept/req.reject multiple times breaks sanity checks in req.accept


Version 1.0.12
--------------
*Released 2014-11-28*

* Fixes [issue #170](https://github.com/theturtle32/WebSocket-Node/issues/170) - Non-native XOR implementation broken after making JSHint happy


Version 1.0.11
--------------
*Released 2014-11-25*

* Fixes some undefined behavior surrounding closing WebSocket connections and more reliably handles edge cases.
* Adds an implementation of the W3C WebSocket API for browsers to facilitate sharing code between client and server via browserify. (Thanks, [@ibc](https://github.com/ibc)!)
* `WebSocketConnection.prototype.close` now accepts optional `reasonCode` and `description` parameters.
* Calling `accept` or `reject` more than once on a `WebSocketRequest` will now throw an error.  [Issue #149](https://github.com/theturtle32/WebSocket-Node/issues/149)
* Handling connections dropped by client before accepted by server [Issue #167](https://github.com/theturtle32/WebSocket-Node/issues/167)
* Integrating Gulp and JSHint (Thanks, [@ibc](https://github.com/ibc)!)
* Starting to add individual unit tests (using substack's [tape](github.com/substack/tape) and [faucet](github.com/substack/faucet))


Version 1.0.10
--------------
*Released 2014-10-22*

* Fixed Issue [#146](https://github.com/theturtle32/WebSocket-Node/issues/146) that was causing WebSocketClient to throw errors when instantiated if passed `tlsOptions`.

Version 1.0.9
-------------
*Released 2014-10-20*

* Fixing an insidious corner-case bug that prevented `WebSocketConnection` from firing the `close` event in certain cases when there was an error on the underlying `Socket`, leading to connections sticking around forever, stuck erroneously in the `connected` state.  These "ghost" connections would cause an error event when trying to write to them.
* Removed deprecated `websocketVersion` property.  Use `webSocketVersion` instead (case difference).
* Allowing user to specify all properties for `tlsOptions` in WebSocketClient, not just a few whitelisted properties.  This keeps us from having to constantly add new config properties for new versions of Node. (Thanks, [jesusprubio](https://github.com/jesusprubio))
* Removing support for Node 0.4.x and 0.6.x.
* Adding `fuzzingclient.json` spec file for the Autobahn Test Suite.
* Now more fairly emitting `message` events from the `WebSocketConnection`.  Previously, all buffered frames for a connection would be processed and all `message` events emitted before moving on to processing the next connection with available data.  Now We process one frame per connection (most of the time) in a more fair round-robin fashion.
* Now correctly calling the `EventEmitter` superclass constructor during class instance initialization.
* `WebSocketClient.prototype.connect` now accepts the empty string (`''`) to mean "no subprotocol requested."  Previously either `null` or an empty array (`[]`) was required.
* Fixing a `TypeError` bug in `WebSocketRouter` (Thanks, [a0000778](https://github.com/a0000778))
* Fixing a potential race condition when attaching event listeners to the underlying `Socket`. (Thanks [RichardBsolut](https://github.com/RichardBsolut))
* `WebSocketClient` now accepts an optional options hash to be passed to `(http|https).request`. (Thanks [mildred](https://github.com/mildred) and [aus](https://github.com/aus))  This enables the following new abilities, amongst others:
  * Use WebSocket-Node from behind HTTP/HTTPS proxy servers using [koichik/node-tunnel](https://github.com/koichik/node-tunnel) or similar.
  * Specify the local port and local address to bind the outgoing request socket to.
* Adding option to ignore `X-Forwarded-For` headers when accepting connections from untrusted clients.
* Adding ability to mount a `WebSocketServer` instance to an arbitrary number of Node http/https servers.
* Adding browser shim so Browserify won't blow up when trying to package up code that uses WebSocket-Node.  The shim is a no-op, it ***does not implement a wrapper*** providing the WebSocket-Node API in the browser.
* Incorporating upstream enhancements for the native C++ UTF-8 validation and xor masking functions. (Thanks [einaros](https://github.com/einaros) and [kkoopa](https://github.com/kkoopa))


Version 1.0.8
-------------
*Released 2012-12-26*

* Fixed remaining naming inconsistency of "websocketVersion" as opposed to "webSocketVersion" throughout the code, and added deprecation warnings for use of the old casing throughout.
* Fixed an issue with our case-insensitive handling of WebSocket subprotocols.  Clients that requested a mixed-case subprotocol would end up failing the connection when the server accepted the connection, returning a lower-case version of the subprotocol name.  Now we return the subprotocol name in the exact casing that was requested by the client, while still maintaining the case-insensitive verification logic for convenience and practicality.
* Making sure that any socket-level activity timeout that may have been set on a TCP socket is removed when initializing a connection.
* Added support for native TCP Keep-Alive instead of using the WebSocket ping/pong packets to serve that function.
* Fixed cookie parsing to be compliant with RFC 2109

Version 1.0.7
-------------
*Released 2012-08-12*

* ***Native modules are now optional!*** If they fail to compile, WebSocket-Node will still work but will not verify that received UTF-8 data is valid, and xor masking/unmasking of payload data for security purposes will not be as efficient as it is performed in JavaScript instead of native code.
* Reduced Node.JS version requirement back to v0.6.10

Version 1.0.6
-------------
*Released 2012-05-22*

* Now requires Node v0.6.13 since that's the first version that I can manage to successfully build the native UTF-8 validator with node-gyp through npm.

Version 1.0.5
-------------
*Released 2012-05-21*

* Fixes the issues that users were having building the native UTF-8 validator on Windows platforms.  Special Thanks to:
  * [zerodivisi0n](https://github.com/zerodivisi0n)
  * [andreasbotsikas](https://github.com/andreasbotsikas)
* Fixed accidental global variable usage (Thanks, [hakobera](https://github.com/hakobera)!)
* Added callbacks to the send* methods that provide notification of messages being sent on the wire and any socket errors that may occur when sending a message. (Thanks, [zerodivisi0n](https://github.com/zerodivisi0n)!)
* Added option to disable logging in the echo-server in the test folder (Thanks, [oberstet](https://github.com/oberstet)!)


Version 1.0.4
-------------
*Released 2011-12-18*

* Now validates that incoming UTF-8 messages do, in fact, contain valid UTF-8 data.  The connection is dropped with prejudice if invalid data is received.  This strict behavior conforms to the WebSocket RFC and is verified by the Autobahn Test Suite.  This is accomplished in a performant way by using a native C++ Node module created by [einaros](https://github.com/einaros).
* Updated handling of connection closure to pass more of the Autobahn Test Suite.

Version 1.0.3
-------------
*Released 2011-12-18*

* Substantial speed increase (~150% on my machine, depending on the circumstances) due to an optimization in FastBufferList.js that drastically reduces the number of memory alloctions and buffer copying. ([kazuyukitanimura](https://github.com/kazuyukitanimura))


Version 1.0.2
-------------
*Released 2011-11-28*

* Fixing whiteboard example to work under Node 0.6.x ([theturtle32](https://github.com/theturtle32))
* Now correctly emitting a `close` event with a 1006 error code if there is a TCP error while writing to the socket during the handshake. ([theturtle32](https://github.com/theturtle32))
* Catching errors when writing to the TCP socket during the handshake. ([justoneplanet](https://github.com/justoneplanet))
* No longer outputting console.warn messages when there is an error writing to the TCP socket ([justoneplanet](https://github.com/justoneplanet))
* Fixing some formatting errors, commas, semicolons, etc.  ([kaisellgren](https://github.com/kaisellgren))


Version 1.0.1
-------------
*Released 2011-11-21*

* Now works with Node 0.6.2 as well as 0.4.12
* Support TLS in WebSocketClient
* Added support for setting and reading cookies
* Added WebSocketServer.prototype.broadcast(data) convenience method
* Added `resourceURL` property to WebSocketRequest objects.  It is a Node URL object with the `resource` and any query string params already parsed.
* The WebSocket request router no longer includes the entire query string when trying to match the path name of the request.
* WebSocketRouterRequest objects now include all the properties and events of WebSocketRequest objects.
* Removed more console.log statements.  Please rely on the various events emitted to be notified of error conditions.  I decided that it is not a library's place to spew information to the console.
* Renamed the `websocketVersion` property to `webSocketVersion` throughout the code to fix inconsistent capitalization.  `websocketVersion` has been kept for compatibility but is deprecated and may be removed in the future.
* Now outputting the sanitized version of custom header names rather than the raw value.  This prevents invalid HTTP from being put onto the wire if given an illegal header name.


I decided it's time to start maintaining a changelog now, starting with version 1.0.1.
