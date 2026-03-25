# stream-events

> Get an event when you're being sent data or asked for it.

## About

This is just a simple thing that tells you when `_read` and `_write` have been called, saving you the trouble of writing this yourself. You receive two events `reading` and `writing`-- no magic is performed.

This works well with [duplexify](https://github.com/mafintosh/duplexify) or lazy streams, so you can wait until you know you're being used as a stream to do something asynchronous, such as fetching an API token.


## Use
```sh
$ npm install --save stream-events
```
```js
var stream = require('stream')
var streamEvents = require('stream-events')
var util = require('util')

function MyStream() {
  stream.Duplex.call(this)
  streamEvents.call(this)
}
util.inherits(MyStream, stream.Duplex)

MyStream.prototype._read = function(chunk) {
  console.log('_read called as usual')
  this.push(new Buffer(chunk))
  this.push(null)
}

MyStream.prototype._write = function() {
  console.log('_write called as usual')
}

var stream = new MyStream

stream.on('reading', function() {
  console.log('stream is being asked for data')
})

stream.on('writing', function() {
  console.log('stream is being sent data')
})

stream.pipe(stream)
```

### Using with Duplexify
```js
var duplexify = require('duplexify')
var streamEvents = require('stream-events')
var fs = require('fs')

var dup = streamEvents(duplexify())

dup.on('writing', function() {
  // do something async
  dup.setWritable(/*writable stream*/)
})

fs.createReadStream('file').pipe(dup)
```