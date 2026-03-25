# release-zalgo

Helps you write code with promise-like chains that can run both synchronously
and asynchronously.

## Installation

```console
$ npm install --save release-zalgo
```

## Usage

If you use this module, you'll release **Ẕ̶̨̫̹̌͊͌͑͊̕͢͟a̡̜̦̝͓͇͗̉̆̂͋̏͗̍ͅl̡̛̝͍̅͆̎̊̇̕͜͢ģ̧̧͍͓̜̲͖̹̂͋̆̃̑͗̋͌̊̏ͅǫ̷̧͓̣͚̞̣̋̂̑̊̂̀̿̀̚͟͠ͅ**. You mustn't do that.

Before you proceed, please read this great post by [Isaac
Schlueter](http://izs.me/) on [Designing APIs for
Asynchrony](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony).

The first rule of using this package is to keep your external API consistent.

The second rule is to accept the burden of controlling Ẕ̶̨̫̹̌͊͌͑͊̕͢͟a̡̜̦̝͓͇͗̉̆̂͋̏͗̍ͅl̡̛̝͍̅͆̎̊̇̕͜͢ģ̧̧͍͓̜̲͖̹̂͋̆̃̑͗̋͌̊̏ͅǫ̷̧͓̣͚̞̣̋̂̑̊̂̀̿̀̚͟͠ͅ by ensuring he does not escape your API boundary.

With that out of the way… this package lets you write code that can run both
synchronously and asynchronously. This is useful if you have fairly complex
logic for which you don't want to write multiple implementations. See
[`package-hash`](https://github.com/novemberborn/package-hash) for instance.

This is best shown by example. Let's say you have a `hashFile()` function:

```js
const crypto = require('crypto')
const fs = require('fs')

function hashFile (file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, (err, buffer) => err ? reject(err) : resolve(buffer))
  })
    .then(buffer => {
      const hash = crypto.createHash('sha1')
      hash.update(buffer)
      return hash.digest('hex')
    })
}
```

A synchronous version could be implemented like this:

```js
function hashFileSync (file) {
  const buffer = fs.readFileSync(file)
  const hash = crypto.createHash('sha1')
  hash.update(buffer)
  return hash.digest('hex')
}
```

Here's the version that uses `release-zalgo`:

```js
const crypto = require('crypto')
const fs = require('fs')

const releaseZalgo = require('release-zalgo')

const readFile = {
  async (file) {
    return new Promise((resolve, reject) => {
      fs.readFile(file, (err, buffer) => err ? reject(err) : resolve(buffer))
    })
  },

  sync (file) {
    return fs.readFileSync(file)
  }
}

function run (zalgo, file) {
  return zalgo.run(readFile, file)
    .then(buffer => {
      const hash = crypto.createHash('sha1')
      hash.update(buffer)
      return hash.digest('hex')
    })
}

function hashFile (file) {
  return run(releaseZalgo.async(), file)
}

function hashFileSync (file) {
  const result = run(releaseZalgo.sync(), file)
  return releaseZalgo.unwrapSync(result)
}
```

Note how close the `run()` implementation is to the original `hashFile()`.

Just don't do this:

```js
function badExample (zalgo, file) {
  let buffer
  zalgo.run(readFile, file)
    .then(result => { buffer = result })

  const hash = crypto.createHash('sha1')
  hash.update(buffer)
  return hash.digest('hex')
}
```

This won't work asynchronously. Just pretend you're working with promises and
you'll be OK.

## API

First require the package:

```js
const releaseZalgo = require('release-zalgo')
```

### `releaseZalgo.sync()`

Returns a `zalgo` object that runs code synchronously:

```js
const zalgo = releaseZalgo.sync()
```

### `releaseZalgo.async()`

Returns a `zalgo` object that runs code asynchronously:

```js
const zalgo = releaseZalgo.async()
```

### `releaseZalgo.unwrapSync(thenable)`

Synchronously unwraps a [thenable], which is returned when running
synchronously. Returns the [thenable]s fulfilment value, or throws its
rejection reason. Throws if the [thenable] is asynchronous.

### `zalgo.run(executors, ...args)`

When running synchronously, `executors.sync()` is called. When running
asynchronously `executors.async()` is used. The executer is invoked immediately
and passed the remaining arguments.

For asynchronous execution a `Promise` is returned. It is fulfilled with
`executors.async()`'s return value, or rejected if `executors.async()` throws.

For synchronous execution a *[thenable]* is returned. It has the same methods as
`Promise` except that callbacks are invoked immediately. The [thenable] is
fulfilled with `executors.sync()`'s return value, or rejected if
`executors.sync()` throws.

### `zalgo.all(arr)`

When running synchronously, returns a new [thenable] which is fulfilled with
an array, after unwrapping all items in `arr`.

When running asynchronously, delegates to `Promise.all(arr)`.

### `zalgo.returns(value)`

When running synchronously, returns a new [thenable] which is fulfilled with
`value`.

When running asynchronously, delegates to `Promise.resolve(value)`.

### `zalgo.throws(reason)`

When running synchronously, returns a new [thenable] which is rejected with
`reason`.

When running asynchronously, delegates to `Promise.reject(reason)`.

### Thenables

Thenables are returned when running sychronously. They're much like `Promise`s,
in that they have `then()` and `catch()` methods. You can pass callbacks and
they'll be invoked with the fulfilment value or rejection reason. Callbacks
can return other thenables or throw exceptions.

Note that `then()` and `catch()` must be called on the thenable, e.g.
`thenable.then()`, not `(thenable.then)()`.

Thenables should not be exposed outside of your API. Use
`releaseZalgo.unwrapSync()` to unwrap them.

[thenable]: #thenables
