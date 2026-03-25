# enabled

[![Version npm][version]](http://browsenpm.org/package/enabled)[![Build Status][build]](https://travis-ci.org/3rd-Eden/enabled)[![Dependencies][david]](https://david-dm.org/3rd-Eden/enabled)[![Coverage Status][cover]](https://coveralls.io/r/3rd-Eden/enabled?branch=master)

[version]: http://img.shields.io/npm/v/enabled.svg?style=flat-square
[build]: http://img.shields.io/travis/3rd-Eden/enabled/master.svg?style=flat-square
[david]: https://img.shields.io/david/3rd-Eden/enabled.svg?style=flat-square
[cover]: http://img.shields.io/coveralls/3rd-Eden/enabled/master.svg?style=flat-square

Enabled is a small utility that can check if certain namespace are enabled by
environment variables which are automatically transformed to regular expressions
for matching.

## Installation

The module is release in the public npm registry and can be used in browsers and
servers as it uses plain ol ES3 to make the magic work.

```
npm install --save enabled
```

## Usage

First of all make sure you've required the module using:

```js
'use strict';

var enabled = require('enabled');
```

The returned `enabled` function accepts 2 arguments.

1. `name` **string**, The namespace that should match.
2. `pattern` **string**, The pattern that the name should satisfy

It will return a boolean indication of a match.

#### Examples

```js
var flag = 'foo';

enabled('foo', flag); // true;
enabled('bar', flag); // false;

//
// Use * for wild cards.
//
var wildcard = 'foob*';

enabled('foobar', wildcard); // true;
enabled('barfoo', wildcard); // false;

//
// Use - to ignore.
//
var ignore = 'foobar,-shizzle,nizzle';

enabled('foobar', ignore); // true;
enabled('shizzle-my-nizzle', ignore); // false;
enabled('nizzle', ignore); // true;
```

## License

[MIT](./LICENSE)
