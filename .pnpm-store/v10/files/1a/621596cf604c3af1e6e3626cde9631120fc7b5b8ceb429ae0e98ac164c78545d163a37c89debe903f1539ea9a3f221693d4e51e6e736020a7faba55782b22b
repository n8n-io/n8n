# promise-inflight

One promise for multiple requests in flight to avoid async duplication

## USAGE

```javascript
const inflight = require('promise-inflight')

// some request that does some stuff
function req(key) {
  // key is any random string.  like a url or filename or whatever.
  return inflight(key, () => {
    // this is where you'd fetch the url or whatever
    return Promise.delay(100)
  })
}

// only assigns a single setTimeout
// when it dings, all thens get called with the same result.  (There's only
// one underlying promise.)
req('foo').then(…)
req('foo').then(…)
req('foo').then(…)
req('foo').then(…)
```

## SEE ALSO

* [inflight](https://npmjs.com/package/inflight) - For the callback based function on which this is based.

## STILL NEEDS

Tests!
