# Detect if a string is a data URL

[![Build Status](https://travis-ci.org/killmenot/valid-data-url.svg?branch=master)](https://travis-ci.org/killmenot/valid-data-url) [![Coverage Status](https://coveralls.io/repos/github/killmenot/valid-data-url/badge.svg?branch=master)](https://coveralls.io/github/killmenot/valid-data-url?branch=master) [![Dependency Status](https://david-dm.org/killmenot/valid-data-url.svg)](https://david-dm.org/killmenot/valid-data-url) [![Dev Dependency Status](https://david-dm.org/killmenot/valid-data-url/dev-status.svg)](https://david-dm.org/killmenot/valid-data-url) [![npm](https://img.shields.io/npm/v/valid-data-url.svg)](https://www.npmjs.com/package/valid-data-url) [![npm](https://img.shields.io/npm/dm/valid-data-url.svg)](https://www.npmjs.com/package/valid-data-url)

Based on [Brian Grinstead](https://github.com/bgrins)'s solution https://gist.github.com/bgrins/6194623. Special thanks to [Jamie Davis](https://github.com/davisjam) for helping to fix [ReDoS](https://www.regular-expressions.info/redos.html) exploit.


## Syntax

The "data" URL scheme is described here [RFC2397](https://tools.ietf.org/html/rfc2397)

    dataurl    := "data:" [ mediatype ] [ ";base64" ] "," data
    mediatype  := [ type "/" subtype ] *( ";" parameter )
    data       := *urlchar
    parameter  := attribute "=" value

where `urlchar` is imported from [RFC2396](https://www.ietf.org/rfc/rfc2045.txt), and `type`, `subtype`, `attribute` and `value` are the corresponding tokens from [RFC2045](https://www.ietf.org/rfc/rfc2045.txt), represented using URL escaped encoding of [RFC2396](https://www.ietf.org/rfc/rfc2396.txt) as necessary.

Attribute values in [RFC2045](https://www.ietf.org/rfc/rfc2045.txt) are allowed to be either represented as tokens or as quoted strings. However, within a `data` URL, the `quoted-string` representation would be awkward, since the quote mark is itself not a valid urlchar. For this reason, parameter values should use the URL Escaped encoding instead of quoted string if the parameter values contain any `tspecial`.

The `;base64` extension is distinguishable from a content-type parameter by the fact that it doesn't have a following `=` sign.


## Install

```
npm install valid-data-url

```


## Example

```javascript
'use strict';

var validDataUrl = require('valid-data-url');
var isValid = validDataUrl('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D'); // true

```

## People

The original author is [Brian Grinstead](https://github.com/bgrins)


## Contributors

 - [Gary Guagliardo Jr](https://github.com/guag)
 - [Steve Powell](https://github.com/steve-p-com)
 - [Rob Garrison](https://github.com/Mottie)
 - [Frank Tan](https://github.com/tansongyang)
 - [Jamie Davis](https://github.com/davisjam)
 - [Bogdan Chadkin](https://github.com/TrySound)
 - [Jon Ursenbach](https://github.com/erunion)


## Licence

The MIT License (MIT)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
