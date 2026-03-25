# web-streams-polyfill

Web Streams, based on the WHATWG spec reference implementation.  

[![build status](https://api.travis-ci.com/MattiasBuelens/web-streams-polyfill.svg?branch=master)](https://travis-ci.com/MattiasBuelens/web-streams-polyfill)
[![npm version](https://img.shields.io/npm/v/web-streams-polyfill.svg)](https://www.npmjs.com/package/web-streams-polyfill)
[![license](https://img.shields.io/npm/l/web-streams-polyfill.svg)](https://github.com/MattiasBuelens/web-streams-polyfill/blob/master/LICENSE)
[![Join the chat at https://gitter.im/web-streams-polyfill/Lobby](https://badges.gitter.im/web-streams-polyfill/Lobby.svg)](https://gitter.im/web-streams-polyfill/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Links

 - [Official spec][spec]
 - [Reference implementation][ref-impl]

## Usage

This library comes in multiple variants:
* `web-streams-polyfill`: a [ponyfill] that provides the stream implementations 
  without replacing any globals, targeting ES2015+ environments.
  * ✅ Node 6+ through `import` or `require()`
  * ✅ Modern web browsers through `import`/`export` or `<script type="module">`
  * ✅ Web apps for modern browsers using a bundler (like webpack or Rollup)
* `web-streams-polyfill/es5`: a ponyfill targeting ES5+ environments.
  * ✅ Legacy Node through `require()`
  * ✅ Legacy web browsers through [AMD][amd]
  * ✅ Web apps for legacy browsers using a bundler (like webpack or Rollup)
* `web-streams-polyfill/polyfill`: a polyfill that replaces the native stream implementations,
  targeting ES2015+ environments.
  * ✅ Modern web browsers through regular `<script>`
* `web-streams-polyfill/polyfill/es5`: a polyfill targeting ES5+ environments.
  * ✅ Legacy web browsers through regular `<script>`

Each variant also includes TypeScript type definitions, compatible with the DOM type definitions for streams included in TypeScript.

In version 4, the list of variants was reworked to have more modern defaults and to reduce the download size of the package.
See the [migration guide][migrating] for more information.

Usage as a polyfill:
```html
<!-- option 1: hosted by unpkg CDN -->
<script src="https://unpkg.com/web-streams-polyfill/dist/polyfill.js"></script>
<!-- option 2: self hosted -->
<script src="/path/to/web-streams-polyfill/dist/polyfill.js"></script>
<script>
var readable = new ReadableStream();
</script>
```
Usage as a Node module:
```js
var streams = require("web-streams-polyfill");
var readable = new streams.ReadableStream();
```
Usage as a ponyfill from within a ES2015 module:
```js
import { ReadableStream } from "web-streams-polyfill";
const readable = new ReadableStream();
```
Usage as a polyfill from within an ES2015 module:
```js
import "web-streams-polyfill/polyfill";
const readable = new ReadableStream();
```

## Compatibility

The default and `polyfill` variants work in any ES2015-compatible environment.

The `es5` and `polyfill/es5` variants work in any ES5-compatible environment that has a global `Promise`.
If you need to support older browsers or Node versions that do not have a native `Promise` implementation
(check the [support table][promise-support]), you must first include a `Promise` polyfill
(e.g. [promise-polyfill][promise-polyfill]).

[Async iterable support for `ReadableStream`][rs-asynciterator] is available in all variants, but requires an ES2018-compatible environment or a polyfill for `Symbol.asyncIterator`.

[`WritableStreamDefaultController.signal`][ws-controller-signal] is available in all variants, but requires a global `AbortController` constructor. If necessary, consider using a polyfill such as [abortcontroller-polyfill].

## Compliance

The polyfill implements [version `e9355ce` (18 Apr 2022)][spec-snapshot] of the streams specification.

The polyfill is tested against the same [web platform tests][wpt] that are used by browsers to test their native implementations.
It aims to pass all tests, although it allows some exceptions for practical reasons:
* The default (ES2015) variant passes all of the tests, except for:
  * The ["bad buffers and views" tests for readable byte streams][wpt-bad-buffers].
    These tests require the implementation to synchronously transfer the contents of an `ArrayBuffer`, which is not yet possible from JavaScript (although there is a [proposal][proposal-arraybuffer-transfer] to make it possible).
    The reference implementation "cheats" on these tests [by making a copy instead][ref-impl-transferarraybuffer], but that is unacceptable for the polyfill's performance ([#3][issue-3]).
  * The [test for the prototype of `ReadableStream`'s async iterator][wpt-async-iterator-prototype].
    Retrieving the correct `%AsyncIteratorPrototype%` requires using an async generator (`async function* () {}`), which is invalid syntax before ES2018.
    Instead, the polyfill [creates its own version][stub-async-iterator-prototype] which is functionally equivalent to the real prototype.
  * The tests [with patched globals][wpt-rs-patched-global] and [with `Object.prototype.then`][wpt-then-interception].
    These tests are meant for browsers to ensure user-land modifications cannot affect the internal logic of `pipeTo()` and `tee()`. 
    However, it's not reasonable or desirable for a user-land polyfill to try and isolate itself completely from using the global `Object`.
  * Certain `pipeTo()` tests that require synchronous inspection of the stream's state  ([1][wpt-pipe-sync-state-1], [2][wpt-pipe-sync-state-2]).
    Because the polyfill uses the public `getReader()` and `getWriter()` API to implement `pipeTo()`, it can only *asynchronously* observe if and when a stream becomes closed or errored.
    Therefore, when the readable and the writable end become errored *at the exact same time*, it's difficult for the polyfill to observe these state changes in exactly the same order. 
* The ES5 variant passes the same tests as the ES2015 variant, except for various tests about specific characteristics of the constructors, properties and methods.
  These test failures do not affect the run-time behavior of the polyfill.
  For example:
  * The `name` property of down-leveled constructors is incorrect.
  * The `length` property of down-leveled constructors and methods with optional arguments is incorrect.
  * Not all properties and methods are correctly marked as non-enumerable.
  * Down-leveled class methods are not correctly marked as non-constructable.

The type definitions are compatible with the built-in stream types of TypeScript 3.3 and higher.

## Contributors

Thanks to these people for their work on [the original polyfill][creatorrr-polyfill]:

 - Diwank Singh Tomer ([creatorrr](https://github.com/creatorrr))
 - Anders Riutta ([ariutta](https://github.com/ariutta))

[spec]: https://streams.spec.whatwg.org
[ref-impl]: https://github.com/whatwg/streams
[ponyfill]: https://github.com/sindresorhus/ponyfill
[amd]: https://requirejs.org/docs/whyamd.html
[migrating]: https://github.com/MattiasBuelens/web-streams-polyfill/blob/v4.0.0-beta.3/MIGRATING.md
[promise-support]: https://kangax.github.io/compat-table/es6/#test-Promise
[promise-polyfill]: https://www.npmjs.com/package/promise-polyfill
[rs-asynciterator]: https://streams.spec.whatwg.org/#rs-asynciterator
[ws-controller-signal]: https://streams.spec.whatwg.org/#ws-default-controller-signal
[abortcontroller-polyfill]: https://www.npmjs.com/package/abortcontroller-polyfill
[spec-snapshot]: https://streams.spec.whatwg.org/commit-snapshots/e9355ce79925947e8eb496563d599c329769d315/
[wpt]: https://github.com/web-platform-tests/wpt/tree/6a46d9cb8d20c510a620141c721b81b460a4ee55/streams
[wpt-bad-buffers]: https://github.com/web-platform-tests/wpt/blob/6a46d9cb8d20c510a620141c721b81b460a4ee55/streams/readable-byte-streams/bad-buffers-and-views.any.js
[proposal-arraybuffer-transfer]: https://github.com/domenic/proposal-arraybuffer-transfer
[ref-impl-transferarraybuffer]: https://github.com/whatwg/streams/blob/e9355ce79925947e8eb496563d599c329769d315/reference-implementation/lib/abstract-ops/ecmascript.js#L16
[issue-3]: https://github.com/MattiasBuelens/web-streams-polyfill/issues/3
[wpt-async-iterator-prototype]: https://github.com/web-platform-tests/wpt/blob/6a46d9cb8d20c510a620141c721b81b460a4ee55/streams/readable-streams/async-iterator.any.js#L24
[stub-async-iterator-prototype]: https://github.com/MattiasBuelens/web-streams-polyfill/blob/v4.0.0-beta.3/src/lib/readable-stream/async-iterator.ts#L126-L134
[wpt-rs-patched-global]: https://github.com/web-platform-tests/wpt/blob/887350c2f46def5b01c4dd1f8d2eee35dfb9c5bb/streams/readable-streams/patched-global.any.js
[wpt-then-interception]: https://github.com/web-platform-tests/wpt/blob/cf33f00596af295ee0f207c88e23b5f8b0791307/streams/piping/then-interception.any.js
[wpt-pipe-sync-state-1]: https://github.com/web-platform-tests/wpt/blob/e1e713c842e54ea0a9410ddc988b63d0e1d31973/streams/piping/multiple-propagation.any.js#L30-L53
[wpt-pipe-sync-state-2]: https://github.com/web-platform-tests/wpt/blob/e1e713c842e54ea0a9410ddc988b63d0e1d31973/streams/piping/multiple-propagation.any.js#L114-L138
[creatorrr-polyfill]: https://github.com/creatorrr/web-streams-polyfill
