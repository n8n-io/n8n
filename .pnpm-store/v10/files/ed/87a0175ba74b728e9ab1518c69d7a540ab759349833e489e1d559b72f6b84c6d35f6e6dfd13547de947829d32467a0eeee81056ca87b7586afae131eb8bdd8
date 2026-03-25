# jsSHA

A pure TypeScript/JavaScript streaming implementation of the complete Secure
Hash Standard (SHA) family (SHA-1, SHA-224/256/384/512, SHA3-224/256/384/512,
SHAKE128/256, cSHAKE128/256, and KMAC128/256) with HMAC.

[![npm](https://img.shields.io/npm/v/jssha)](https://www.npmjs.com/package/jssha)
[![Build Status](https://travis-ci.org/Caligatio/jsSHA.svg?branch=master)](https://travis-ci.org/Caligatio/jsSHA)
[![Coverage Status](https://coveralls.io/repos/github/Caligatio/jsSHA/badge.svg?branch=master)](https://coveralls.io/github/Caligatio/jsSHA?branch=master)
[![NPM](https://img.shields.io/npm/l/jssha)](https://opensource.org/licenses/BSD-3-Clause)

## Usage

More complete documentation can be found on the
[jsSHA Wiki](https://github.com/Caligatio/jsSHA/wiki) but below are common
use-cases.

### Installation

#### Browser

Include the desired JavaScript file (sha.js, sha1.js, sha256.js, sha512.js, or
sha3.js) in your header:

```html
<script type="text/javascript" src="/path/to/sha.js"></script>
```

#### Node.js

jsSHA is available through NPM and be installed by simply doing

```console
npm install jssha
```

To use the module, first require it using:

```javascript
const jsSHA = require("jssha");
/* The limited variant files are also exported (sha1, sha256, sha512, and sha3)
 * using conditional subpath exports in Node.js v13+ or using --experimental-modules
 * in v12 */
const jsSHA1 = require("jssha/sha1");
/* For Node.js versions that don't support subpath exports, you can do the
 * following instead: */
const jsSHA1 = require("jssha/dist/sha1");
/* Alternatively, you can load it as an ESM (Node.js v13+ or using
 * --experimental-modules in v12) */
import jsSHA from "jssha";
```

### Hashing

Instantiate a new `jsSHA` object with the desired hash variant, input format,
and options as parameters. The hash variant can be one of SHA-1, SHA-224,
SHA3-224, SHA-256, SHA3-256, SHA-384, SHA3-384, SHA-512, SHA3-512, SHAKE128, or
SHAKE256. The input format can be one of HEX, TEXT, B64, BYTES, ARRAYBUFFER, or
UINT8ARRAY. You can then stream in input using the `update` object function,
calling it multiple times if needed. Finally, simply call `getHash` with the
output type as a parameter (B64, HEX, BYTES, ARRAYBUFFER, or UINT8ARRAY).
Example to calculate the SHA-512 of "This is a test":

```javascript
const shaObj = new jsSHA("SHA-512", "TEXT", { encoding: "UTF8" });
/* .update() can be chained */
shaObj.update("This is").update(" a ");
shaObj.update("test");
const hash = shaObj.getHash("HEX");
```

The constructor takes a hashmap as a optional third argument with defaults
`{"encoding" : "UTF8", "numRounds" : 1}`. `numRounds` controls the number of
hashing iterations/rounds performed and `encoding` specifies the encoding used
to encode TEXT-type inputs. Valid `encoding` values are "UTF8", "UTF16BE", and
"UTF16LE".

`getHash` also takes a hashmap as an optional second argument with defaults
`{"outputUpper" : false, "b64Pad" : "="}`. `outputUpper` is only used for "HEX"
outputs and `b64Pad` only for "B64" outputs.

**_Important_**: SHAKE128 and SHAKE256 require `outputLen` to be in the hashmap
where `outputLen` is the desired output length of the SHAKE algorithm in a
multiple of 8 bits.

### HMAC

Instantiate a new `jsSHA` object similiar to hashing but with the third argument
in the form of `{ "hmacKey": { "value": VALUE, "format": FORMAT } }`. FORMAT
takes the same values as the input format from hashing and the VALUE is then
either a `string`, `ArrayBuffer`, or `Uint8Array`. You can stream in the input
using the `update` object function just like hashing. Finally, get the HMAC by
calling the `getHash` function with the output type as its argument. Example to
calculate the SHA-512 HMAC of the string "This is a test" with the key "abc":

```javascript
const shaObj = new jsSHA("SHA-512", "TEXT", {
  hmacKey: { value: "abc", format: "TEXT" },
});
shaObj.update("This is a ");
shaObj.update("test");
const hmac = shaObj.getHash("HEX");
```

Note: You cannot specify `numRounds` with HMAC.

### cSHAKE

Instantiate a new `jsSHA` object similiar to HMAC but first argument being
either "CSHAKE128" or "CSHAKE256" and the third argument in the form of
`{ "customization"?: { "value": VALUE, "format": FORMAT }, "funcName"?: { "value": VALUE, "format": FORMAT } }`.
FORMAT takes the same values as the input format from hashing and the VALUE is
then either a `string`, `ArrayBuffer`, or `Uint8Array`. Per the NIST
specification, both `customization` and `funcName` are optional. You can stream
in the input using the `update` object function just like hashing. Finally, get
the hash by calling the `getHash` function with the output type and length as
arguments. Example to calculate the cSHAKE128 of the string "This is a test"
with the customization string "My Tagged Application" and an output size of
256-bits.

```javascript
const shaObj = new jsSHA("CSHAKE128", "TEXT", {
  customization: { value: "My Tagged Application", format: "TEXT" },
});
shaObj.update("This is a ");
shaObj.update("test");
const cshake = shaObj.getHash("HEX", { outputLen: 256 });
```

Note: You cannot specify `numRounds` with cSHAKE.

**_Important_**: `outputLen` is required to be in the hashmap where `outputLen`
is the desired output length of the cSHAKE algorithm in a multiple of 8 bits.

### KMAC

Instantiate a new `jsSHA` object similiar to cSHAKE but first argument being
either "KMAC128" or "KMAC256" and the third argument in the form of
`{ "customization"?: { "value": VALUE, "format": FORMAT }, "kmacKey?: { "value": VALUE, "format": FORMAT } }`.
FORMAT takes the same values as the input format from hashing and the VALUE is
then either a `string`, `ArrayBuffer`, or `Uint8Array`. Per the NIST
specification `customization` is optional whereas `kmacKey` is required. You can
stream in the input using the `update` object function just like hashing.
Finally, get the hash by calling the `getHash` function with the output type and
length as arguments. Example to calculate the KMAC128 of the string "This is a
test" with the customization string "My Tagged Application", key "abc", and an
output size of 256-bits.

```javascript
const shaObj = new jsSHA("KMAC128", "TEXT", {
  customization: { value: "My Tagged Application", format: "TEXT" },
  kmacKey: { value: "abc", format: "TEXT" },
});
shaObj.update("This is a ");
shaObj.update("test");
const kmac = shaObj.getHash("HEX", { outputLen: 256 });
```

Note: You cannot specify `numRounds` with KMAC.

**_Important_**: `outputLen` is required to be in the hashmap where `outputLen`
is the desired output length of the KMAC algorithm in a multiple of 8 bits.

## Files

- **dist/sha.js** - The minified ECMAScript 3 (ES3) compatible [Universal Module
  Definition (UMD)][umd] version of the library with support for all hash
  variants. Its accompanying source map can be found in dist/sha.js.map and its
  TypeScript declarations in dist/sha.d.ts.
- **dist/sha.mjs** - The minified ECMAScript 2015 (ES6) compatible ESM version
  of the library with support for all hash variants. Its accompanying source map
  can be found in dist/sha.mjs.map and its TypeScript declarations in
  dist/sha.d.ts.
- **dist/sha1.{js,mjs}** - The minified UMD and ESM versions of the library with
  support for only the SHA-1 hash variant. Its accompanying TypeScript
  declarations can be found in dist/sha1.d.ts.
- **dist/sha256.{js,mjs}** - The minified UMD and ESM versions of the library
  with support for only the SHA-224 and SHA-256 hash variants. Its accompanying
  TypeScript declarations can be found in dist/sha256.d.ts.
- **dist/sha512.{js,mjs}** - The minified UMD and ESM versions of the library
  with support for only the SHA-384 and SHA-512 hash variants. Its accompanying
  TypeScript declarations can be found in dist/sha513.d.ts.
- **dist/sha3.{js,mjs}** - The minified UMD and ESM versions of the library with
  support for only the SHA3-224, SHA3-256, SHA3-384, SHA3-512, SHAKE128,
  SHAKE256, cSHAKE128, cSHAKE256, KMAC128, and KMAC256 hash variants. Its
  accompanying TypeScript declarations can be found in dist/sha3.d.ts.

## Contact Info

The project's website is located at https://caligatio.github.io/jsSHA/

[umd]: https://github.com/umdjs/umd
