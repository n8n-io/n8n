[![build status](https://app.travis-ci.com/dankogai/js-base64.svg)](https://app.travis-ci.com/github/dankogai/js-base64)

# base64.js

Yet another [Base64] transcoder.

[Base64]: http://en.wikipedia.org/wiki/Base64

## Install

```shell
$ npm install --save js-base64
```

## Usage

### In Browser

Locally…

```html
<script src="base64.js"></script>
```

… or Directly from CDN.  In which case you don't even need to install.

```html
<script src="https://cdn.jsdelivr.net/npm/js-base64@3.7.2/base64.min.js"></script>
```

This good old way loads `Base64` in the global context (`window`).  Though `Base64.noConflict()` is made available, you should consider using ES6 Module to avoid tainting `window`.

### As an ES6 Module

locally…

```javascript
import { Base64 } from 'js-base64';
```

```javascript
// or if you prefer no Base64 namespace
import { encode, decode } from 'js-base64';
```

or even remotely.

```html
<script type="module">
// note jsdelivr.net does not automatically minify .mjs
import { Base64 } from 'https://cdn.jsdelivr.net/npm/js-base64@3.7.2/base64.mjs';
</script>
```

```html
<script type="module">
// or if you prefer no Base64 namespace
import { encode, decode } from 'https://cdn.jsdelivr.net/npm/js-base64@3.7.2/base64.mjs';
</script>
```

### node.js (commonjs)

```javascript
const {Base64} = require('js-base64');
```

Unlike the case above, the global context is no longer modified.

You can also use [esm] to `import` instead of `require`.

[esm]: https://github.com/standard-things/esm

```javascript
require=require('esm')(module);
import {Base64} from 'js-base64';
```

## SYNOPSIS

```javascript
let latin = 'dankogai';
let utf8  = '小飼弾'
let u8s   =  new Uint8Array([100,97,110,107,111,103,97,105]);
Base64.encode(latin);             // ZGFua29nYWk=
Base64.encode(latin, true));      // ZGFua29nYWk skips padding
Base64.encodeURI(latin));         // ZGFua29nYWk
Base64.btoa(latin);               // ZGFua29nYWk=
Base64.btoa(utf8);                // raises exception
Base64.fromUint8Array(u8s);       // ZGFua29nYWk=
Base64.fromUint8Array(u8s, true); // ZGFua29nYW which is URI safe
Base64.encode(utf8);              // 5bCP6aO85by+
Base64.encode(utf8, true)         // 5bCP6aO85by-
Base64.encodeURI(utf8);           // 5bCP6aO85by-
```

```javascript
Base64.decode(      'ZGFua29nYWk=');// dankogai
Base64.decode(      'ZGFua29nYWk'); // dankogai
Base64.atob(        'ZGFua29nYWk=');// dankogai
Base64.atob(        '5bCP6aO85by+');// 'å°é£¼å¼¾' which is nonsense
Base64.toUint8Array('ZGFua29nYWk=');// u8s above
Base64.decode(      '5bCP6aO85by+');// 小飼弾
// note .decodeURI() is unnecessary since it accepts both flavors
Base64.decode(      '5bCP6aO85by-');// 小飼弾
```

```javascript
Base64.isValid(0);      // false: 0 is not string
Base64.isValid('');     // true: a valid Base64-encoded empty byte
Base64.isValid('ZA=='); // true: a valid Base64-encoded 'd'
Base64.isValid('Z A='); // true: whitespaces are okay
Base64.isValid('ZA');   // true: padding ='s can be omitted
Base64.isValid('++');   // true: can be non URL-safe
Base64.isValid('--');   // true: or URL-safe
Base64.isValid('+-');   // false: can't mix both
```

### Built-in Extensions

By default `Base64` leaves built-in prototypes untouched.  But you can extend them as below.

```javascript
// you have to explicitly extend String.prototype
Base64.extendString();
// once extended, you can do the following
'dankogai'.toBase64();        // ZGFua29nYWk=
'小飼弾'.toBase64();           // 5bCP6aO85by+
'小飼弾'.toBase64(true);       // 5bCP6aO85by-
'小飼弾'.toBase64URI();        // 5bCP6aO85by- ab alias of .toBase64(true)
'小飼弾'.toBase64URL();        // 5bCP6aO85by- an alias of .toBase64URI()
'ZGFua29nYWk='.fromBase64();  // dankogai
'5bCP6aO85by+'.fromBase64();  // 小飼弾
'5bCP6aO85by-'.fromBase64();  // 小飼弾
'5bCP6aO85by-'.toUint8Array();// u8s above
```

```javascript
// you have to explicitly extend Uint8Array.prototype
Base64.extendUint8Array();
// once extended, you can do the following
u8s.toBase64();     // 'ZGFua29nYWk='
u8s.toBase64URI();  // 'ZGFua29nYWk'
u8s.toBase64URL();  // 'ZGFua29nYWk' an alias of .toBase64URI()
```

```javascript
// extend all at once
Base64.extendBuiltins()
```

## `.decode()` vs `.atob` (and `.encode()` vs `btoa()`)

Suppose you have:

```
var pngBase64 = 
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
```

Which is a Base64-encoded 1x1 transparent PNG, **DO NOT USE** `Base64.decode(pngBase64)`.  Use `Base64.atob(pngBase64)` instead.  `Base64.decode()` decodes to UTF-8 string while `Base64.atob()` decodes to bytes, which is compatible to browser built-in `atob()` (Which is absent in node.js).  The same rule applies to the opposite direction.

Or even better, `Base64.toUint8Array(pngBase64)`.

### If you really, really need an ES5 version

You can transpiles to an ES5 that runs on IEs before 11.  Do the following in your shell.

```shell
$ make base64.es5.js
```

## Brief History

* Since version 3.3 it is written in TypeScript.  Now `base64.mjs` is compiled from `base64.ts` then `base64.js` is generated from `base64.mjs`.
* Since version 3.7 `base64.js` is ES5-compatible again (hence IE11-compabile).
* Since 3.0 `js-base64` switch to ES2015 module so it is no longer compatible with legacy browsers like IE (see above)
