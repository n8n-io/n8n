# Timing safe string compare using double HMAC

[![Node.js Version](https://img.shields.io/node/v/tsscmp.svg?style=flat-square)](https://nodejs.org/en/download)
[![npm](https://img.shields.io/npm/v/tsscmp.svg?style=flat-square)](https://npmjs.org/package/tsscmp)
[![NPM Downloads](https://img.shields.io/npm/dm/tsscmp.svg?style=flat-square)](https://npmjs.org/package/tsscmp)
[![Build Status](https://img.shields.io/travis/suryagh/tsscmp/master.svg?style=flat-square)](https://travis-ci.org/suryagh/tsscmp)
[![Build Status](https://img.shields.io/appveyor/ci/suryagh/tsscmp/master.svg?style=flat-square&label=windows)](https://ci.appveyor.com/project/suryagh/tsscmp)
[![Dependency Status](http://img.shields.io/david/suryagh/tsscmp.svg?style=flat-square)](https://david-dm.org/suryagh/tsscmp)
[![npm-license](http://img.shields.io/npm/l/tsscmp.svg?style=flat-square)](LICENSE)


Prevents [timing attacks](http://codahale.com/a-lesson-in-timing-attacks/) using Brad Hill's
[Double HMAC pattern](https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2011/february/double-hmac-verification/)
to perform secure string comparison. Double HMAC avoids the timing atacks by blinding the
timing channel using random time per attempt comparison against iterative brute force attacks.


## Install

```
npm install tsscmp
```
## Why
To compare secret values like **authentication tokens**, **passwords** or
**capability urls** so that timing information is not
leaked to the attacker.

## Example

```js
var timingSafeCompare = require('tsscmp');

var sessionToken = '127e6fbfe24a750e72930c';
var givenToken = '127e6fbfe24a750e72930c';

if (timingSafeCompare(sessionToken, givenToken)) {
  console.log('good token');
} else {
  console.log('bad token');
}
```
##License: 
[MIT](LICENSE)

**Credits to:**  [@jsha](https://github.com/jsha) |
[@bnoordhuis](https://github.com/bnoordhuis) |
[@suryagh](https://github.com/suryagh) |
 