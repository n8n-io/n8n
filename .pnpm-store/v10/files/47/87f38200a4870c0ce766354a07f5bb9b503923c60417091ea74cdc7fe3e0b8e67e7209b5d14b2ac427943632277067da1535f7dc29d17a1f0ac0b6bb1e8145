# pump

pump is a small node module that pipes streams together and destroys all of them if one of them closes.

```
npm install pump
```

[![build status](http://img.shields.io/travis/mafintosh/pump.svg?style=flat)](http://travis-ci.org/mafintosh/pump)

## What problem does it solve?

When using standard `source.pipe(dest)` source will _not_ be destroyed if dest emits close or an error.
You are also not able to provide a callback to tell when then pipe has finished.

pump does these two things for you

## Usage

Simply pass the streams you want to pipe together to pump and add an optional callback

``` js
var pump = require('pump')
var fs = require('fs')

var source = fs.createReadStream('/dev/random')
var dest = fs.createWriteStream('/dev/null')

pump(source, dest, function(err) {
  console.log('pipe finished', err)
})

setTimeout(function() {
  dest.destroy() // when dest is closed pump will destroy source
}, 1000)
```

You can use pump to pipe more than two streams together as well

``` js
var transform = someTransformStream()

pump(source, transform, anotherTransform, dest, function(err) {
  console.log('pipe finished', err)
})
```

If `source`, `transform`, `anotherTransform` or `dest` closes all of them will be destroyed.

Similarly to `stream.pipe()`, `pump()` returns the last stream passed in, so you can do:

```
return pump(s1, s2) // returns s2
```

If you want to return a stream that combines *both* s1 and s2 to a single stream use
[pumpify](https://github.com/mafintosh/pumpify) instead.

## License

MIT

## Related

`pump` is part of the [mississippi stream utility collection](https://github.com/maxogden/mississippi) which includes more useful stream modules similar to this one.
