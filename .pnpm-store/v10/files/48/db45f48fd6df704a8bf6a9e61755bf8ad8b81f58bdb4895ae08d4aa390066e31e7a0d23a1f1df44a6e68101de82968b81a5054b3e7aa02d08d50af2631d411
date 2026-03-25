# stubs

> It's a simple stubber.

## About

For when you don't want to write the same thing over and over to cache a method and call an override, then revert it, and blah blah.


## Use
```sh
$ npm install --save-dev stubs
```
```js
var mylib = require('./lib/index.js')
var stubs = require('stubs')

// make it a noop
stubs(mylib, 'create')

// stub it out
stubs(mylib, 'create', function() {
  // calls this instead
})

// stub it out, but call the original first
stubs(mylib, 'create', { callthrough: true }, function() {
  // call original method, then call this
})

// use the stub for a while, then revert
stubs(mylib, 'create', { calls: 3 }, function() {
  // call this 3 times, then use the original method
})
```


## API

### stubs(object, method[[, opts], stub])

#### object
- Type: Object

#### method
- Type: String

Name of the method to stub.

#### opts
- (optional)
- Type: Object

##### opts.callthrough
- (optional)
- Type: Boolean
- Default: `false`

Call the original method as well as the stub (if a stub is provided).

##### opts.calls
- (optional)
- Type: Number
- Default: `0` (never revert)

Number of calls to allow the stub to receive until reverting to the original.

#### stub
- (optional)
- Type: Function
- Default: `function() {}`

This method is called in place of the original method. If `opts.callthrough` is `true`, this method is called *after* the original method is called as well.