tweetnacl-util-js
=================

String encoding utilities extracted from early versions of <https://github.com/dchest/tweetnacl-js>

Notice
------

Encoding/decoding functions in this package are correct,
however their performance and wide compatibility with uncommon runtimes is not
something that is considered important compared to the simplicity and size of
implementation. For example, they don't work under
React Native.

Instead of this package, I strongly recommend using my [StableLib](https://github.com/StableLib/stablelib) packages:

* [@stablelib/utf8](https://www.stablelib.com/modules/_utf8_utf8_.html) for UTF-8
  encoding/decoding (note that the names of operations are reversed compared to
  this package): `npm install @stablelib/utf8`

* [@stablelib/base64](https://www.stablelib.com/modules/_base64_base64_.html) for
  constant-time Base64 encoding/decoding: `npm install @stablelib/base64`


Installation
------------

Use a package manager:

[Bower](http://bower.io):

    $ bower install tweetnacl-util

[NPM](https://www.npmjs.org/):

    $ npm install tweetnacl-util

or [download source code](https://github.com/dchest/tweetnacl-util-js/releases).


Usage
------

To make keep backward compatibility with code that used `nacl.util` previously
included with TweetNaCl.js, just include it as usual:

```
<script src="nacl.min.js"></script>
<script src="nacl-util.min.js"></script>
<script>
  // nacl.util functions are now available, e.g.:
  // nacl.util.decodeUTF8
</script>
```

When using CommonJS:

```
var nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
```


Documentation
-------------

#### nacl.util.decodeUTF8(string)

Decodes string and returns `Uint8Array` of bytes.

#### nacl.util.encodeUTF8(array)

Encodes `Uint8Array` or `Array` of bytes into string.

#### nacl.util.decodeBase64(string)

Decodes Base-64 encoded string and returns `Uint8Array` of bytes.

#### nacl.util.encodeBase64(array)

Encodes `Uint8Array` or `Array` of bytes into string using Base-64 encoding.
