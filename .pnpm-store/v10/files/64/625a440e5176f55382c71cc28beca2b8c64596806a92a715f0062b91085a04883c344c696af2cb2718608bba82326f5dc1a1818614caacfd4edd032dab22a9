# call-me-maybe [![Continuous Release](https://github.com/limulus/call-me-maybe/actions/workflows/continuous-release.yaml/badge.svg)](https://github.com/limulus/call-me-maybe/actions/workflows/continuous-release.yaml)

Let your JS API users either give you a callback or receive a promise.

## Usage

```javascript
var maybe = require("call-me-maybe")

module.exports = function asyncFunc (cb) {
  return maybe(cb, new Promise(function(resolve, reject) {
    // ...
  }))
}
```

## API

### maybe(cb, promise)

If the callback `cb` is truthy, returns `undefined` and will call `cb` when `promise` is settled. The parameters passed to `cb` are standard error-first:

  - If `promise` is fulfilled, then it is called with the result of the promise: `cb(null, result)`
  - If `promise` is rejected, then it is called with the rejection error: `cb(err)`

If `cb` is falsey, then `promise` is returned.
