# minipass-pipeline

Create a pipeline of streams using Minipass.

Calls `.pipe()` on all the streams in the list.  Returns a stream where
writes got to the first pipe in the chain, and reads are from the last.

Errors are proxied along the chain and emitted on the Pipeline stream.

## USAGE

```js
const Pipeline = require('minipass-pipeline')

// the list of streams to pipeline together,
// a bit like `input | transform | output` in bash
const p = new Pipeline(input, transform, output)

p.write('foo') // writes to input
p.on('data', chunk => doSomething()) // reads from output stream

// less contrived example (but still pretty contrived)...
const decode = new bunzipDecoder()
const unpack = tar.extract({ cwd: 'target-dir' })
const tbz = new Pipeline(decode, unpack)

fs.createReadStream('archive.tbz').pipe(tbz)

// specify any minipass options if you like, as the first argument
// it'll only try to pipeline event emitters with a .pipe() method
const p = new Pipeline({ objectMode: true }, input, transform, output)

// If you don't know the things to pipe in right away, that's fine.
// use p.push(stream) to add to the end, or p.unshift(stream) to the front
const databaseDecoderStreamDoohickey = (connectionInfo) => {
  const p = new Pipeline()
  logIntoDatabase(connectionInfo).then(connection => {
    initializeDecoderRing(connectionInfo).then(decoderRing => {
      p.push(connection, decoderRing)
      getUpstreamSource(upstream => {
        p.unshift(upstream)
      })
    })
  })
  // return to caller right away
  // emitted data will be upstream -> connection -> decoderRing pipeline
  return p
}
```

Pipeline is a [minipass](http://npm.im/minipass) stream, so it's as
synchronous as the streams it wraps.  It will buffer data until there is a
reader, but no longer, so make sure to attach your listeners before you
pipe it somewhere else.

## `new Pipeline(opts = {}, ...streams)`

Create a new Pipeline with the specified Minipass options and any streams
provided.

## `pipeline.push(stream, ...)`

Attach one or more streams to the pipeline at the end (read) side of the
pipe chain.

## `pipeline.unshift(stream, ...)`

Attach one or more streams to the pipeline at the start (write) side of the
pipe chain.
