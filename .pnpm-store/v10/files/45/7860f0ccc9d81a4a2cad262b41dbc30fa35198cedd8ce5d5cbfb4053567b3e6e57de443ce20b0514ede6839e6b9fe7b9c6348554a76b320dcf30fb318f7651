
# RNDM

Random string generator.
Basically `Math.random().toString(36).slice(2)`,
but with both upper and lower case letters and arbitrary lengths.
Useful for creating fast, not cryptographically secure salts.

## API

```js
// base62 by default
var rndm = require('rndm')
var salt = rndm(16)
```

### var salt = rndm(length)

### var salt = rndm.base62(length)

### var salt = rndm.base36(length)

### var salt = rndm.base10(length)

### var random = rndm.create(characters)

Create a new random generator with custom characters.
