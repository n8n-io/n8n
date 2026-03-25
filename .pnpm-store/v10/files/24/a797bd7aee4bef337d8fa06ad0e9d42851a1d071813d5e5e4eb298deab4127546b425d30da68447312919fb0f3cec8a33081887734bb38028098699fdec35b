# minipass-collect

A Minipass stream that collects all the data into a single chunk

Note that this buffers ALL data written to it, so it's only good for
situations where you are sure the entire stream fits in memory.

Note: this is primarily useful for the `Collect.PassThrough` class, since
Minipass streams already have a `.collect()` method which returns a promise
that resolves to the array of chunks, and a `.concat()` method that returns
the data concatenated into a single Buffer or String.

## USAGE

```js
const Collect = require('minipass-collect')

const collector = new Collect()
collector.on('data', allTheData => {
  console.log('all the data!', allTheData)
})

someSourceOfData.pipe(collector)

// note that you can also simply do:
someSourceOfData.pipe(new Minipass()).concat().then(data => ...)
// or even, if someSourceOfData is a Minipass:
someSourceOfData.concat().then(data => ...)
// but you might prefer to have it stream-shaped rather than
// Promise-shaped in some scenarios.
```

If you want to collect the data, but _also_ act as a passthrough stream,
then use `Collect.PassThrough` instead (for example to memoize streaming
responses), and listen on the `collect` event.

```js
const Collect = require('minipass-collect')

const collector = new Collect.PassThrough()
collector.on('collect', allTheData => {
  console.log('all the data!', allTheData)
})

someSourceOfData.pipe(collector).pipe(someOtherStream)
```

All [minipass options](http://npm.im/minipass) are supported.
