# @gar/promisify

### Promisify an entire object or class instance

This module leverages es6 Proxy and Reflect to promisify every function in an
object or class instance.

It assumes the callback that the function is expecting is the last
parameter, and that it is an error-first callback with only one value,
i.e. `(err, value) => ...`. This mirrors node's `util.promisify` method.

In order that you can use it as a one-stop-shop for all your promisify
needs, you can also pass it a function.  That function will be
promisified as normal using node's built-in `util.promisify` method.

[node's custom promisified
functions](https://nodejs.org/api/util.html#util_custom_promisified_functions)
will also be mirrored, further allowing this to be a drop-in replacement
for the built-in `util.promisify`.

### Examples

Promisify an entire object

```javascript

const promisify = require('@gar/promisify')

class Foo {
  constructor (attr) {
    this.attr = attr
  }

  double (input, cb) {
    cb(null, input * 2)
  }

const foo = new Foo('baz')
const promisified = promisify(foo)

console.log(promisified.attr)
console.log(await promisified.double(1024))
```

Promisify a function

```javascript

const promisify = require('@gar/promisify')

function foo (a, cb) {
  if (a !== 'bad') {
    return cb(null, 'ok')
  }
  return cb('not ok')
}

const promisified = promisify(foo)

// This will resolve to 'ok'
promisified('good')

// this will reject
promisified('bad')
```
