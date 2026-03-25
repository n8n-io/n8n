# utf8.js [![Build status](https://travis-ci.org/mathiasbynens/utf8.js.svg?branch=master)](https://travis-ci.org/mathiasbynens/utf8.js) [![Code coverage status](http://img.shields.io/coveralls/mathiasbynens/utf8.js/master.svg)](https://coveralls.io/r/mathiasbynens/utf8.js) [![Dependency status](https://gemnasium.com/mathiasbynens/utf8.js.svg)](https://gemnasium.com/mathiasbynens/utf8.js)

_utf8.js_ is a well-tested UTF-8 encoder/decoder written in JavaScript. Unlike many other JavaScript solutions, it is designed to be a _proper_ UTF-8 encoder/decoder: it can encode/decode any scalar Unicode code point values, as per [the Encoding Standard](https://encoding.spec.whatwg.org/#utf-8). [Here’s an online demo.](https://mothereff.in/utf-8)

Feel free to fork if you see possible improvements!

## Installation

Via [npm](https://www.npmjs.com/):

```bash
npm install utf8
```

In a browser:

```html
<script src="utf8.js"></script>
```

In [Node.js](https://nodejs.org/):

```js
const utf8 = require('utf8');
```

## API

### `utf8.encode(string)`

Encodes any given JavaScript string (`string`) as UTF-8, and returns the UTF-8-encoded version of the string. It throws an error if the input string contains a non-scalar value, i.e. a lone surrogate. (If you need to be able to encode non-scalar values as well, use [WTF-8](https://mths.be/wtf8) instead.)

```js
// U+00A9 COPYRIGHT SIGN; see http://codepoints.net/U+00A9
utf8.encode('\xA9');
// → '\xC2\xA9'
// U+10001 LINEAR B SYLLABLE B038 E; see http://codepoints.net/U+10001
utf8.encode('\uD800\uDC01');
// → '\xF0\x90\x80\x81'
```

### `utf8.decode(byteString)`

Decodes any given UTF-8-encoded string (`byteString`) as UTF-8, and returns the UTF-8-decoded version of the string. It throws an error when malformed UTF-8 is detected. (If you need to be able to decode encoded non-scalar values as well, use [WTF-8](https://mths.be/wtf8) instead.)

```js
utf8.decode('\xC2\xA9');
// → '\xA9'

utf8.decode('\xF0\x90\x80\x81');
// → '\uD800\uDC01'
// → U+10001 LINEAR B SYLLABLE B038 E
```

### `utf8.version`

A string representing the semantic version number.

## Support

utf8.js has been tested in at least Chrome 27-39, Firefox 3-34, Safari 4-8, Opera 10-28, IE 6-11, Node.js v0.10.0, Narwhal 0.3.2, RingoJS 0.8-0.11, PhantomJS 1.9.0, and Rhino 1.7RC4.

## Unit tests & code coverage

After cloning this repository, run `npm install` to install the dependencies needed for development and testing. You may want to install Istanbul _globally_ using `npm install istanbul -g`.

Once that’s done, you can run the unit tests in Node using `npm test` or `node tests/tests.js`. To run the tests in Rhino, Ringo, Narwhal, PhantomJS, and web browsers as well, use `grunt test`.

To generate the code coverage report, use `grunt cover`.

## FAQ

### Why is the first release named v2.0.0? Haven’t you heard of [semantic versioning](http://semver.org/)?

Long before utf8.js was created, the `utf8` module on npm was registered and used by another (slightly buggy) library. @ryanmcgrath was kind enough to give me access to the `utf8` package on npm when I told him about utf8.js. Since there has already been a v1.0.0 release of the old library, and to avoid breaking backwards compatibility with projects that rely on the `utf8` npm package, I decided the tag the first release of utf8.js as v2.0.0 and take it from there.

## Author

| [![twitter/mathias](https://gravatar.com/avatar/24e08a9ea84deb17ae121074d0f17125?s=70)](https://twitter.com/mathias "Follow @mathias on Twitter") |
|---|
| [Mathias Bynens](https://mathiasbynens.be/) |

## License

utf8.js is available under the [MIT](https://mths.be/mit) license.
