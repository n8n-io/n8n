# Lazy Streams

> *Create streams lazily when they are read from or written to.*  
> `lazystream: 1.0.1`  

## Why?

Sometimes you feel the itch to open *all the files* at once. You want to pass a bunch of streams around, so the consumer does not need to worry where the data comes from.
From a software design point-of-view this sounds entirely reasonable. Then there is that neat little function `fs.createReadStream()` that opens a file and gives you a nice `fs.ReadStream` to pass around, so you use what the mighty creator deities of node bestowed upon you.

> `Error: EMFILE, too many open files`  
> ─ *node*

This package provides two classes based on the node's Streams3 API (courtesy of `readable-stream` to ensure a stable version).

## Class: lazystream.Readable

A wrapper for readable streams. Extends [`stream.PassThrough`](http://nodejs.org/api/stream.html#stream_class_stream_passthrough).

### new lazystream.Readable(fn [, options])

* `fn` *{Function}*  
  The function that the lazy stream will call to obtain the stream to actually read from.
* `options` *{Object}*  
  Options for the underlying `PassThrough` stream, accessible by `fn`.

Creates a new readable stream. Once the stream is accessed (for example when you call its `read()` method, or attach a `data`-event listener) the `fn` function is called with the outer `lazystream.Readable` instance bound to `this`.

If you pass an `options` object to the constuctor, you can access it in your `fn` function.

```javascript
new lazystream.Readable(function (options) {
  return fs.createReadStream('/dev/urandom');
});
```

## Class: lazystream.Writable

A wrapper for writable streams. Extends [`stream.PassThrough`](http://nodejs.org/api/stream.html#stream_class_stream_passthrough).

### new lazystream.Writable(fn [, options])

* `fn` *{Function}*  
  The function that the lazy stream will call to obtain the stream to actually write to.
* `options` *{Object}*  
  Options for the underlying `PassThrough` stream, accessible by `fn`.

Creates a new writable stream. Just like the one above but for writable streams.

```javascript
new lazystream.Writable(function () {
  return fs.createWriteStream('/dev/null');
});
```

## Install

```console
$ npm install lazystream --save
lazystream@1.0.1 node_modules/lazystream
└── readable-stream@2.0.5
```

## Changelog

### v1.0.1

- [#3](https://github.com/jpommerening/node-lazystream/issues/3): (finally) fixed a long-standing publishing error

### v1.0.0

- [#2](https://github.com/jpommerening/node-lazystream/issues/2): [unconditionally](https://r.va.gg/2014/06/why-i-dont-use-nodes-core-stream-module.html) use `readable-stream` _2.x_.

### v0.2.0

- [#1](https://github.com/jpommerening/node-lazystream/pull/1): error events are now propagated

### v0.1.0

- _(this was the first release)_

## Contributing

Fork it, branch it, send me a pull request. We'll work out the rest together.

## Credits

[Chris Talkington](https://github.com/ctalkington) and his [node-archiver](https://github.com/ctalkington/node-archiver) for providing a use-case.

## [License](LICENSE)

Copyright (c) 2013 J. Pommerening, contributors.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

