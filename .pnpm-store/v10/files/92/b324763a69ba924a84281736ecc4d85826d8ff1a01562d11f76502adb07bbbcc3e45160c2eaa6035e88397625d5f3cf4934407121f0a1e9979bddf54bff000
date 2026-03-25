[![build status](https://api.travis-ci.org/disjunction/url-value-parser.png)](https://travis-ci.org/disjunction/url-value-parser)
[![Coverage Status](https://coveralls.io/repos/github/disjunction/url-value-parser/badge.svg?branch=master&bust=1)](https://coveralls.io/github/disjunction/url-value-parser?branch=master)

# UrlValueParser

A helper ES6 class letting you extract values from URL paths,
leaving the other parts untouched.

It uses an internal class `ValueDetector` determining
what is a value and what is not. By default the following
path chunks are considered values:

* decimal numbers
* strings in UUID format
* hex numbers consisting of 7 or more characters
  and consistent lower or upper case
* long base64 encoded strings
* JSON Web Tokens (JWT)

You can customize all of the logic by providing options,
overriding methods or providing your own value detector.
See the source - it's easy, i promise.

## Usage

```javascript
const UrlValueParser = require('url-value-parser');
const parser = new UrlValueParser(/* {options} */);

parser.parsePathValues('/some/path/154/userId/ABC363AFE2');
/*
 here the values would be 154 and ABC363AFE2
 thus it returns:

  {
    chunks: ['some', 'path', '154', 'userId', 'ABC363AFE2'],
    valueIndexes: [2, 5]
  }
*/

parser.replacePathValues('/some/path/154/userId/ABC363AFE2', '#id');
// returns: /some/path/#id/userId/#id
```

## Options

* **replaceMasks** - use custom masks instead of built-in
* **extraMasks** - add your custom masks additionally to the built-in ones
* **minHexLength** - when using built-in masks, count only long enough HEX values, **DEFAULT: 7**
* **minBase64Length** - when using built-in masks, count only long enough base64 values, **DEFAULT: 66**

If strings are provided in an array to **replaceMasks** and **extraMasks**,
then they're automatically converted into RegExp

Example:

```javascript
const parser = new UrlValueParser({
  minHexLength: 4,
  extraMasks: [
    /^z_.*$/,
    '^[0-9]+\\.[0-9]+$'
  ]
});
```

## License

MIT No Attribution License
