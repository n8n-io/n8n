# npm-normalize-package-bin

Turn any flavor of allowable package.json bin into a normalized object.

## API

```js
const normalize = require('npm-normalize-package-bin')
const pkg = {name: 'foo', bin: 'bar'}
console.log(normalize(pkg)) // {name:'foo', bin:{foo: 'bar'}}
```

Also strips out weird dots and slashes to prevent accidental and/or
malicious bad behavior when the package is installed.
