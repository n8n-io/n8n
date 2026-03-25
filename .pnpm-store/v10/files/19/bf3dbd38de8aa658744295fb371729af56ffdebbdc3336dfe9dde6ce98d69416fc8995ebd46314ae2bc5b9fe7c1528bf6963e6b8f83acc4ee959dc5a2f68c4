# minipass-sized

A Minipass stream that raises an error if you get a different number of
bytes than expected.

## USAGE

Use just like any old [minipass](http://npm.im/minipass) stream, but
provide a `size` option to the constructor.

The `size` option must be a positive integer, smaller than
`Number.MAX_SAFE_INTEGER`.

```js
const MinipassSized = require('minipass-sized')
// figure out how much data you expect to get
const expectedSize = +headers['content-length']
const stream = new MinipassSized({ size: expectedSize })
stream.on('error', er => {
  // if it's the wrong size, then this will raise an error with
  // { found: <number>, expect: <number>, code: 'EBADSIZE' }
})
response.pipe(stream)
```

Caveats: this does not work with `objectMode` streams, and will throw a
`TypeError` from the constructor if the size argument is missing or
invalid.
