# byline — buffered stream for reading lines

![npm package](https://nodei.co/npm/byline.png?downloads=true&downloadRank=true)

`byline` is a simple module providing a `LineStream`.

- node v0.10 `streams2` (transform stream)
- supports `pipe`
- supports both UNIX and Windows line endings
- supports [Unicode UTS #18 line boundaries](http://www.unicode.org/reports/tr18/#Line_Boundaries)
- can wrap any readable stream
- can be used as a readable-writable "through-stream" (transform stream)
- super-simple: `stream = byline(stream);`

## Install

    npm install byline

or from source:

    git clone git://github.com/jahewson/node-byline.git
    cd node-byline
    npm link

# Convenience API

The `byline` module can be used as a function to quickly wrap a readable stream:

```javascript
var fs = require('fs'),
    byline = require('byline');

var stream = byline(fs.createReadStream('sample.txt', { encoding: 'utf8' }));
```

The `data` event then emits lines:

```javascript
stream.on('data', function(line) {
  console.log(line);
});
```

# Standard API
    
You just need to add one line to wrap your readable `Stream` with a `LineStream`.

```javascript
var fs = require('fs'),	
    byline = require('byline');

var stream = fs.createReadStream('sample.txt');
stream = byline.createStream(stream);

stream.on('data', function(line) {
  console.log(line);
});
```

# Piping

`byline` supports `pipe` (though it strips the line endings, of course).

```javascript
var stream = fs.createReadStream('sample.txt');
stream = byline.createStream(stream);
stream.pipe(fs.createWriteStream('nolines.txt'));
```

Alternatively, you can create a readable/writable "through-stream" which doesn't wrap any specific
stream:

```javascript
var stream = fs.createReadStream('sample.txt');
stream = byline.createStream(stream);
stream.pipe(fs.createWriteStream('nolines.txt'));
	
var input = fs.createReadStream('LICENSE');
var lineStream = byline.createStream();
input.pipe(lineStream);

var output = fs.createWriteStream('test.txt');
lineStream.pipe(output);
```

# Streams2 API
    
Node v0.10 added a new streams2 API. This allows the stream to be used in non-flowing mode and is
preferred over the legacy pause() and resume() methods.

```javascript
var stream = fs.createReadStream('sample.txt');
stream = byline.createStream(stream);

stream.on('readable', function() {
  var line;
  while (null !== (line = stream.read())) {
    console.log(line);
  }
});
```

# Transform Stream

The `byline` transform stream can be directly manipulated like so:

```javascript
var LineStream = require('byline').LineStream;

var input = fs.createReadStream('sample.txt');
var output = fs.createWriteStream('nolines.txt');

var lineStream = new LineStream();
input.pipe(lineStream);
lineStream.pipe(output);

```

# Empty Lines

By default byline skips empty lines, if you want to keep them, pass the `keepEmptyLines` option in
the call to `byline.createStream(stream, options)` or `byline(stream, options)`.

# Tests

    npm test

# v0.8

If you want to use `node-byline` with node v0.8 then you can use the 2.1.x series. Simply use the
following in your `package.json`:

```javascript
  "dependencies": {
  "byline": ">=2.1.0 <3.0.0"
},
```

# Simple
Unlike other modules (of which there are many), `byline` contains no:

- monkeypatching
- dependencies
- non-standard 'line' events which break `pipe`
- limitations to only file streams
- CoffeeScript
- unnecessary code
