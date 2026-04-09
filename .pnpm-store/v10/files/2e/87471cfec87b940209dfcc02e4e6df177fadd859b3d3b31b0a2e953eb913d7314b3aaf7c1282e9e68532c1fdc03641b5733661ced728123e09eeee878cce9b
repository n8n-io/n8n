# psl (Public Suffix List)

[![Node.js CI](https://github.com/lupomontero/psl/actions/workflows/node.js.yml/badge.svg)](https://github.com/lupomontero/psl/actions/workflows/node.js.yml)

`psl` is a `JavaScript` domain name parser based on the
[Public Suffix List](https://publicsuffix.org/).

This implementation is tested against the
[test data hosted by Mozilla](http://mxr.mozilla.org/mozilla-central/source/netwerk/test/unit/data/test_psl.txt?raw=1)
and kindly provided by [Comodo](https://www.comodo.com/).

Cross browser testing provided by
[<img alt="BrowserStack" width="160" src="./browserstack-logo.svg" />](https://www.browserstack.com/)

## What is the Public Suffix List?

The Public Suffix List is a cross-vendor initiative to provide an accurate list
of domain name suffixes.

The Public Suffix List is an initiative of the Mozilla Project, but is
maintained as a community resource. It is available for use in any software,
but was originally created to meet the needs of browser manufacturers.

A "public suffix" is one under which Internet users can directly register names.
Some examples of public suffixes are ".com", ".co.uk" and "pvt.k12.wy.us". The
Public Suffix List is a list of all known public suffixes.

Source: http://publicsuffix.org


## Installation

This module is available both for Node.js and the browser. See below for more
details.

### Node.js

```sh
npm install psl
```

#### ESM

From version `v1.11.0` you can now import `psl` as ESM.

```js
import psl from 'psl';
```

#### CommonJS

If your project still uses CommonJS on Node.js v12 or later (with support for
conditional exports), you can continue importing the module like in previous
versions.

```js
const psl = require('psl');
```

⚠️ If you are using Node.js v10 or older (😰), you can still use the latest
version of this module, but you will need to import the bundled UMD.

```js
var psl = require('psl/dist/psl.umd.cjs');
```

### Browser

#### Using a bundler

If you are using a bundler to build your app, you should be able to `import`
and/or `require` the module just like in Node.js.

#### ESM (using a CDN)

In modern browsers you can also import the ESM directly from a `CDN`. For
example:

```js
import psl from 'https://unpkg.com/psl@latest/dist/psl.mjs';
```

#### UMD / CommonJS

Finally, you can still download [`dist/psl.umd.cjs`](https://raw.githubusercontent.com/lupomontero/psl/main/dist/psl.umd.cjs)
and include it in a script tag.

```html
<script src="psl.umd.cjs"></script>
```

This script is bundled and wrapped in a [umd](https://github.com/umdjs/umd)
wrapper so you should be able to use it standalone or together with a module
loader.

The script is also available on most popular CDNs. For example:

* https://cdnjs.cloudflare.com/ajax/libs/psl/latest/psl.min.js
* https://unpkg.com/psl@latest/dist/psl.min.js

## API

### `psl.parse(domain)`

Parse domain based on Public Suffix List. Returns an `Object` with the following
properties:

* `tld`: Top level domain (this is the _public suffix_).
* `sld`: Second level domain (the first private part of the domain name).
* `domain`: The domain name is the `sld` + `tld`.
* `subdomain`: Optional parts left of the domain.

#### Examples

Parse domain without subdomain:

```js
import psl from 'psl';

const parsed = psl.parse('google.com');
console.log(parsed.tld); // 'com'
console.log(parsed.sld); // 'google'
console.log(parsed.domain); // 'google.com'
console.log(parsed.subdomain); // null
```

Parse domain with subdomain:

```js
import psl from 'psl';

const parsed = psl.parse('www.google.com');
console.log(parsed.tld); // 'com'
console.log(parsed.sld); // 'google'
console.log(parsed.domain); // 'google.com'
console.log(parsed.subdomain); // 'www'
```

Parse domain with nested subdomains:

```js
import psl from 'psl';

const parsed = psl.parse('a.b.c.d.foo.com');
console.log(parsed.tld); // 'com'
console.log(parsed.sld); // 'foo'
console.log(parsed.domain); // 'foo.com'
console.log(parsed.subdomain); // 'a.b.c.d'
```

### `psl.get(domain)`

Get domain name, `sld` + `tld`. Returns `null` if not valid.

#### Examples

```js
import psl from 'psl';

// null input.
psl.get(null); // null

// Mixed case.
psl.get('COM'); // null
psl.get('example.COM'); // 'example.com'
psl.get('WwW.example.COM'); // 'example.com'

// Unlisted TLD.
psl.get('example'); // null
psl.get('example.example'); // 'example.example'
psl.get('b.example.example'); // 'example.example'
psl.get('a.b.example.example'); // 'example.example'

// TLD with only 1 rule.
psl.get('biz'); // null
psl.get('domain.biz'); // 'domain.biz'
psl.get('b.domain.biz'); // 'domain.biz'
psl.get('a.b.domain.biz'); // 'domain.biz'

// TLD with some 2-level rules.
psl.get('uk.com'); // null);
psl.get('example.uk.com'); // 'example.uk.com');
psl.get('b.example.uk.com'); // 'example.uk.com');

// More complex TLD.
psl.get('c.kobe.jp'); // null
psl.get('b.c.kobe.jp'); // 'b.c.kobe.jp'
psl.get('a.b.c.kobe.jp'); // 'b.c.kobe.jp'
psl.get('city.kobe.jp'); // 'city.kobe.jp'
psl.get('www.city.kobe.jp'); // 'city.kobe.jp'

// IDN labels.
psl.get('食狮.com.cn'); // '食狮.com.cn'
psl.get('食狮.公司.cn'); // '食狮.公司.cn'
psl.get('www.食狮.公司.cn'); // '食狮.公司.cn'

// Same as above, but punycoded.
psl.get('xn--85x722f.com.cn'); // 'xn--85x722f.com.cn'
psl.get('xn--85x722f.xn--55qx5d.cn'); // 'xn--85x722f.xn--55qx5d.cn'
psl.get('www.xn--85x722f.xn--55qx5d.cn'); // 'xn--85x722f.xn--55qx5d.cn'
```

### `psl.isValid(domain)`

Check whether a domain has a valid Public Suffix. Returns a `Boolean` indicating
whether the domain has a valid Public Suffix.

#### Example

```js
import psl from 'psl';

psl.isValid('google.com'); // true
psl.isValid('www.google.com'); // true
psl.isValid('x.yz'); // false
```

## Testing and Building

There are tests both for Node.js and the browser (using [Playwright](https://playwright.dev)
and [BrowserStack](https://www.browserstack.com/)).

```sh
# Run tests in node.
npm test
# Run tests in browserstack.
npm run test:browserstack

# Update rules from publicsuffix.org
npm run update-rules

# Build ESM, CJS and UMD and create dist files
npm run build
```

Feel free to fork if you see possible improvements!

## Acknowledgements

* Mozilla Foundation's [Public Suffix List](https://publicsuffix.org/)
* Thanks to Rob Stradling of [Comodo](https://www.comodo.com/) for providing
  test data.
* Inspired by [weppos/publicsuffix-ruby](https://github.com/weppos/publicsuffix-ruby)

## License

The MIT License (MIT)

Copyright (c) 2014-2024 Lupo Montero <lupomontero@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
