# Node-RSA

Node.js RSA library<br/>
Based on jsbn library from Tom Wu http://www-cs-students.stanford.edu/~tjw/jsbn/

* Pure JavaScript
* No needed OpenSSL
* Generating keys
* Supports long messages for encrypt/decrypt
* Signing and verifying

## Example

```javascript
const NodeRSA = require('node-rsa');
const key = new NodeRSA({b: 512});

const text = 'Hello RSA!';
const encrypted = key.encrypt(text, 'base64');
console.log('encrypted: ', encrypted);
const decrypted = key.decrypt(encrypted, 'utf8');
console.log('decrypted: ', decrypted);
```

## Installing

```shell
npm install node-rsa
```
> <sub>Requires nodejs >= 8.11.1</sub>

### Testing

```shell
npm test
```

## Work environment

This library developed and tested primary for Node.js, but it still can work in browsers with [browserify](http://browserify.org/).

## Usage

### Create instance
```javascript
const NodeRSA = require('node-rsa');

const key = new NodeRSA([keyData, [format]], [options]);
```

* keyData — `{string|buffer|object}` — parameters for generating key or the key in one of supported formats.<br/>
* format — `{string}` — format for importing key. See more details about formats in [Export/Import](#importexport-keys) section.<br/>
* options — `{object}` — additional settings.

#### Options
You can specify some options by second/third constructor argument, or over `key.setOptions()` method.

* environment — working environment (default autodetect):
    * `'browser'` — will run pure js implementation of RSA algorithms.
    * `'node'` for `nodejs >= 0.10.x or io.js >= 1.x` — provide some native methods like sign/verify and encrypt/decrypt.
* encryptionScheme — padding scheme for encrypt/decrypt. Can be `'pkcs1_oaep'` or `'pkcs1'`. Default `'pkcs1_oaep'`.
* signingScheme — scheme used for signing and verifying. Can be `'pkcs1'` or `'pss'` or 'scheme-hash' format string (eg `'pss-sha1'`). Default `'pkcs1-sha256'`, or, if chosen pss: `'pss-sha1'`.

> *Notice:* This lib supporting next hash algorithms: `'md5'`, `'ripemd160'`, `'sha1'`, `'sha256'`, `'sha512'` in browser and node environment and additional `'md4'`, `'sha'`, `'sha224'`, `'sha384'` in node only.

<sub>Some [advanced options info](https://github.com/rzcoder/node-rsa/wiki/Advanced-options)</sub>

#### Creating "empty" key
```javascript
const key = new NodeRSA();
```

#### Generate new 512bit-length key
```javascript
const key = new NodeRSA({b: 512});
```

Also you can use next method:

```javascript
key.generateKeyPair([bits], [exp]);
```

* bits — `{int}` — key size in bits. 2048 by default.
* exp — `{int}` — public exponent. 65537 by default.

#### Load key from PEM string

```javascript
const key = new NodeRSA('-----BEGIN RSA PRIVATE KEY-----\n'+
                      'MIIBOQIBAAJAVY6quuzCwyOWzymJ7C4zXjeV/232wt2ZgJZ1kHzjI73wnhQ3WQcL\n'+
                      'DFCSoi2lPUW8/zspk0qWvPdtp6Jg5Lu7hwIDAQABAkBEws9mQahZ6r1mq2zEm3D/\n'+
                      'VM9BpV//xtd6p/G+eRCYBT2qshGx42ucdgZCYJptFoW+HEx/jtzWe74yK6jGIkWJ\n'+
                      'AiEAoNAMsPqwWwTyjDZCo9iKvfIQvd3MWnmtFmjiHoPtjx0CIQCIMypAEEkZuQUi\n'+
                      'pMoreJrOlLJWdc0bfhzNAJjxsTv/8wIgQG0ZqI3GubBxu9rBOAM5EoA4VNjXVigJ\n'+
                      'QEEk1jTkp8ECIQCHhsoq90mWM/p9L5cQzLDWkTYoPI49Ji+Iemi2T5MRqwIgQl07\n'+
                      'Es+KCn25OKXR/FJ5fu6A6A+MptABL3r8SEjlpLc=\n'+
                      '-----END RSA PRIVATE KEY-----');
```

### Import/Export keys
```javascript
key.importKey(keyData, [format]);
key.exportKey([format]);
```

* keyData — `{string|buffer}` — may be:
    * key in PEM string 
    * Buffer containing PEM string 
    * Buffer containing DER encoded data
    * Object contains key components
* format  — `{string}` — format id for export/import.

#### Format string syntax
Format string composed of several parts: `scheme-[key_type]-[output_type]`<br/>

Scheme — NodeRSA supports multiple format schemes for import/export keys:

  * `'pkcs1'` — public key starts from `'-----BEGIN RSA PUBLIC KEY-----'` header and private key starts from `'-----BEGIN RSA PRIVATE KEY-----'` header
  * `'pkcs8'` — public key starts from `'-----BEGIN PUBLIC KEY-----'` header and private key starts from `'-----BEGIN PRIVATE KEY-----'` header
  * `'openssh'` — public key starts from `'ssh-rsa'` header and private key starts from `'-----BEGIN OPENSSH PRIVATE KEY-----'` header
  * `'components'` — use it for import/export key from/to raw components (see example below). For private key, importing data should contain all private key components, for public key: only public exponent (`e`) and modulus (`n`). All components (except `e`) should be Buffer, `e` could be Buffer or just normal Number.     

Key type — can be `'private'` or `'public'`. Default `'private'`<br/>
Output type — can be:

 * `'pem'` — Base64 encoded string with header and footer. Used by default.
 * `'der'` — Binary encoded key data.

> *Notice:* For import, if *keyData* is PEM string or buffer containing string, you can do not specify format, but if you provide *keyData* as DER you must specify it in format string.

**Shortcuts and examples**
 * `'private'` or `'pkcs1'` or `'pkcs1-private'` == `'pkcs1-private-pem'` — private key encoded in pcks1 scheme as pem string.
 * `'public'` or `'pkcs8-public'` == `'pkcs8-public-pem'` — public key encoded in pcks8 scheme as pem string.
 * `'pkcs8'` or `'pkcs8-private'` == `'pkcs8-private-pem'` — private key encoded in pcks8 scheme as pem string.
 * `'pkcs1-der'` == `'pkcs1-private-der'` — private key encoded in pcks1 scheme as binary buffer.
 * `'pkcs8-public-der'` — public key encoded in pcks8 scheme as binary buffer.

**Code example**

```javascript
const keyData = '-----BEGIN PUBLIC KEY----- ... -----END PUBLIC KEY-----';
key.importKey(keyData, 'pkcs8');
const publicDer = key.exportKey('pkcs8-public-der');
const privateDer = key.exportKey('pkcs1-der');
```

```javascript
key.importKey({
    n: Buffer.from('0086fa9ba066685845fc03833a9699c8baefb53cfbf19052a7f10f1eaa30488cec1ceb752bdff2df9fad6c64b3498956e7dbab4035b4823c99a44cc57088a23783', 'hex'),
    e: 65537,
    d: Buffer.from('5d2f0dd982596ef781affb1cab73a77c46985c6da2aafc252cea3f4546e80f40c0e247d7d9467750ea1321cc5aa638871b3ed96d19dcc124916b0bcb296f35e1', 'hex'),
    p: Buffer.from('00c59419db615e56b9805cc45673a32d278917534804171edcf925ab1df203927f', 'hex'),
    q: Buffer.from('00aee3f86b66087abc069b8b1736e38ad6af624f7ea80e70b95f4ff2bf77cd90fd', 'hex'),
    dmp1: Buffer.from('008112f5a969fcb56f4e3a4c51a60dcdebec157ee4a7376b843487b53844e8ac85', 'hex'),
    dmq1: Buffer.from('1a7370470e0f8a4095df40922a430fe498720e03e1f70d257c3ce34202249d21', 'hex'),
    coeff: Buffer.from('00b399675e5e81506b729a777cc03026f0b2119853dfc5eb124610c0ab82999e45', 'hex')
}, 'components');
const publicComponents = key.exportKey('components-public');
console.log(publicComponents);

/*
{ n: <Buffer 00 86 fa 9b a0 66 68 58 45 fc 03 83 3a 96 99 c8 ba ef b5 3c fb f1 90 52 a7 f1 0f 1e aa 30 48 8c ec 1c eb 75 2b df f2 df 9f ad 6c 64 b3 49 89 56 e7 db ... >,
  e: 65537 
}
*/
```

If you want to only import the public key use `'components-public'` as an option:

```javascript
key.importKey({
    n: Buffer.from('0086fa9ba066685845fc03833a9699c8baefb53cfbf19052a7f10f1eaa30488cec1ceb752bdff2df9fad6c64b3498956e7dbab4035b4823c99a44cc57088a23783', 'hex'),
    e: 65537,
}, 'components-public');
```

### Properties

#### Key testing
```javascript
key.isPrivate();
key.isPublic([strict]);
```
strict — `{boolean}` — if true method will return false if key pair have private exponent. Default `false`.

```javascript
key.isEmpty();
```
Return `true` if key pair doesn't have any data.

#### Key info
```javascript
key.getKeySize();
```
Return key size in bits.

```javascript
key.getMaxMessageSize();
```
Return max data size for encrypt in bytes.

### Encrypting/decrypting

```javascript
key.encrypt(buffer, [encoding], [source_encoding]);
key.encryptPrivate(buffer, [encoding], [source_encoding]); // use private key for encryption
```
Return encrypted data.<br/>

* buffer — `{buffer}` —  data for encrypting, may be string, Buffer, or any object/array. Arrays and objects will encoded to JSON string first.<br/>
* encoding — `{string}` — encoding for output result, may be `'buffer'`, `'binary'`, `'hex'` or `'base64'`. Default `'buffer'`.<br/>
* source_encoding — `{string}` —  source encoding, works only with string buffer. Can take standard Node.js Buffer encodings (hex, utf8, base64, etc). `'utf8'` by default.<br/>

```javascript
key.decrypt(buffer, [encoding]);
key.decryptPublic(buffer, [encoding]); // use public key for decryption
```
Return decrypted data.<br/>

* buffer — `{buffer}` — data for decrypting. Takes Buffer object or base64 encoded string.<br/>
* encoding — `{string}` — encoding for result string. Can also take `'buffer'` for raw Buffer object, or `'json'` for automatic JSON.parse result. Default `'buffer'`.

> *Notice:* `encryptPrivate` and `decryptPublic` using only pkcs1 padding type 1 (not random)

### Signing/Verifying
```javascript
key.sign(buffer, [encoding], [source_encoding]);
```
Return signature for buffer. All the arguments are the same as for `encrypt` method.

```javascript
key.verify(buffer, signature, [source_encoding], [signature_encoding])
```
Return result of check, `true` or `false`.<br/>

* buffer — `{buffer}` — data for check, same as `encrypt` method.<br/>
* signature — `{string}` — signature for check, result of `sign` method.<br/>
* source_encoding — `{string}` — same as for `encrypt` method.<br/>
* signature_encoding — `{string}` — encoding of given signature. May be `'buffer'`, `'binary'`, `'hex'` or `'base64'`. Default `'buffer'`.

## Contributing

Questions, comments, bug reports, and pull requests are all welcome.

## Changelog

### 1.1.0
 * Added OpenSSH key format support.
 
### 1.0.2
 * Importing keys from PEM now is less dependent on non-key data in files.
 
### 1.0.1
 * `importKey()` now returns `this`

### 1.0.0
 * Using semver now 🎉
 * **Breaking change**: Drop support nodejs < 8.11.1
 * **Possible breaking change**: `new Buffer()` call as deprecated was replaced by `Buffer.from` & `Buffer.alloc`.
 * **Possible breaking change**: Drop support for hash scheme `sha` (was removed in node ~10). `sha1`, `sha256` and others still works.
 * **Possible breaking change**: Little change in environment detect algorithm. 

### 0.4.2
 * `no padding` scheme will padded data with zeros on all environments.
 
### 0.4.1
 * `PKCS1 no padding` scheme support.
    
### 0.4.0
 * License changed from BSD to MIT. 
 * Some changes in internal api.
    
### 0.3.3
 * Fixed PSS encode/verify methods with max salt length.     

### 0.3.2
 * Fixed environment detection in web worker.

### 0.3.0
 * Added import/export from/to raw key components. 
 * Removed lodash from dependencies.

### 0.2.30
 * Fixed a issue when the key was generated by 1 bit smaller than specified. It may slow down the generation of large keys.    

### 0.2.24
 * Now used old hash APIs for webpack compatible.

### 0.2.22
 * `encryptPrivate` and `decryptPublic` now using only pkcs1 (type 1) padding.

### 0.2.20
 * Added `.encryptPrivate()` and `.decryptPublic()` methods.
 * Encrypt/decrypt methods in nodejs 0.12.x and io.js using native implementation (> 40x speed boost).
 * Fixed some regex issue causing catastrophic backtracking.

### 0.2.10
 * **Methods `.exportPrivate()` and `.exportPublic()` was replaced by `.exportKey([format])`.**
    * By default `.exportKey()` returns private key as `.exportPrivate()`, if you need public key from `.exportPublic()` you must specify format as `'public'` or `'pkcs8-public-pem'`.
 * Method `.importKey(key, [format])` now has second argument.

### 0.2.0
 * **`.getPublicPEM()` method was renamed to `.exportPublic()`**
 * **`.getPrivatePEM()` method was renamed to `.exportPrivate()`**
 * **`.loadFromPEM()` method was renamed to `.importKey()`**
 * Added PKCS1_OAEP encrypting/decrypting support.
     * **PKCS1_OAEP now default scheme, you need to specify 'encryptingScheme' option to 'pkcs1' for compatibility with 0.1.x version of NodeRSA.**
 * Added PSS signing/verifying support.
 * Signing now supports `'md5'`, `'ripemd160'`, `'sha1'`, `'sha256'`, `'sha512'` hash algorithms in both environments
 and additional `'md4'`, `'sha'`, `'sha224'`, `'sha384'` for nodejs env.
 * **`options.signingAlgorithm` was renamed to `options.signingScheme`**
 * Added `encryptingScheme` option.
 * Property `key.options` now mark as private. Added `key.setOptions(options)` method.


### 0.1.54
 * Added support for loading PEM key from Buffer (`fs.readFileSync()` output).
 * Added `isEmpty()` method.

### 0.1.52
 * Improve work with not properly trimming PEM strings.

### 0.1.50
 * Implemented native js signing and verifying for browsers.
 * `options.signingAlgorithm` now takes only hash-algorithm name.
 * Added `.getKeySize()` and `.getMaxMessageSize()` methods.
 * `.loadFromPublicPEM` and `.loadFromPrivatePEM` methods marked as private.

### 0.1.40
 * Added signing/verifying.

### 0.1.30
 * Added long message support.


## License

Copyright (c) 2014  rzcoder<br/>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Licensing for code used in rsa.js and jsbn.js

Copyright (c) 2003-2005  Tom Wu<br/>
All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND,
EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY
WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.

IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

In addition, the following condition applies:

All redistributions must retain an intact copy of this copyright notice
and disclaimer.

[![Build Status](https://travis-ci.org/rzcoder/node-rsa.svg?branch=master)](https://travis-ci.org/rzcoder/node-rsa)
