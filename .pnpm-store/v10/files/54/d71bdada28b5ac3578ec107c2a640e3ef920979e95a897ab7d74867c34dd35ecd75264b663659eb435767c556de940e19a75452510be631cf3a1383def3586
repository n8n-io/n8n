# rfc2047

Encode and decode [rfc2047](https://www.ietf.org/rfc/rfc2047.txt) (MIME encoded words).

```js
var rfc2047 = require('rfc2047');

console.log(rfc2047.encode('Foo bar æøå ☺'));
// Foo bar =?utf-8?Q?=C3=A6=C3=B8=C3=A5?= =?utf-8?Q?_=E2=98=BA?=

console.log(
  rfc2047.decode('=?iso-8859-1?Q?=A1?=Hola, se=?iso-8859-1?Q?=F1?=or!')
);
// ¡Hola, señor!
```

[![NPM version](https://badge.fury.io/js/rfc2047.png)](http://badge.fury.io/js/rfc2047)
[![Build Status](https://travis-ci.org/One-com/rfc2047.png)](https://travis-ci.org/One-com/rfc2047)
[![Coverage Status](https://coveralls.io/repos/One-com/rfc2047/badge.png)](https://coveralls.io/r/One-com/rfc2047)
[![Dependency Status](https://david-dm.org/One-com/rfc2047.png)](https://david-dm.org/One-com/rfc2047)

## License

The rfc2047 module is licensed under a standard 3-clause BSD license -- see the
`LICENSE`-file for details.
