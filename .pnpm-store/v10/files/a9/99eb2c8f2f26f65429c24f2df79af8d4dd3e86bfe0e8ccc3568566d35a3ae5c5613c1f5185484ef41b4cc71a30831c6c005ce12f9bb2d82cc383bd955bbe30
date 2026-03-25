# quoted-printable [![Build status](https://travis-ci.org/mathiasbynens/quoted-printable.svg?branch=master)](https://travis-ci.org/mathiasbynens/quoted-printable) [![Code coverage status](https://coveralls.io/repos/mathiasbynens/quoted-printable/badge.svg)](https://coveralls.io/r/mathiasbynens/quoted-printable) [![Dependency status](https://gemnasium.com/mathiasbynens/quoted-printable.svg)](https://gemnasium.com/mathiasbynens/quoted-printable)

_quoted-printable_ is a character encoding–agnostic JavaScript implementation of [the `Quoted-Printable` content transfer encoding as defined by RFC 2045](https://tools.ietf.org/html/rfc2045#section-6.7). It can be used to encode plaintext to its `Quoted-Printable` encoding, or the other way around (i.e. decoding). [Here’s an online demo using the UTF-8 character encoding.](https://mothereff.in/quoted-printable)

## Installation

Via [npm](https://www.npmjs.com/):

```bash
npm install quoted-printable
```

Via [Bower](http://bower.io/):

```bash
bower install quoted-printable
```

Via [Component](https://github.com/component/component):

```bash
component install mathiasbynens/quoted-printable
```

In a browser:

```html
<script src="quoted-printable.js"></script>
```

In [Node.js](https://nodejs.org/), [io.js](https://iojs.org/), [Narwhal](http://narwhaljs.org/), and [RingoJS](http://ringojs.org/):

```js
var quotedPrintable = require('quoted-printable');
```

In [Rhino](http://www.mozilla.org/rhino/):

```js
load('quoted-printable.js');
```

Using an AMD loader like [RequireJS](http://requirejs.org/):

```js
require(
  {
    'paths': {
      'quoted-printable': 'path/to/quoted-printable'
    }
  },
  ['quoted-printable'],
  function(quotedPrintable) {
    console.log(quotedPrintable);
  }
);
```

## API

### `quotedPrintable.version`

A string representing the semantic version number.

### `quotedPrintable.encode(input)`

This function takes an encoded byte string (the `input` parameter) and `Quoted-Printable`-encodes it. Each item in the input string represents an octet as per the desired character encoding. Here’s an example that uses UTF-8:

```js
var utf8 = require('utf8');

quotedPrintable.encode(utf8.encode('foo=bar'));
// → 'foo=3Dbar'

quotedPrintable.encode(utf8.encode('Iñtërnâtiônàlizætiøn☃💩'));
// → 'I=C3=B1t=C3=ABrn=C3=A2ti=C3=B4n=C3=A0liz=C3=A6ti=C3=B8n=E2=98=83=F0=9F=92=\r\n=A9'
```

### `quotedPrintable.decode(text)`

This function takes a string of text (the `text` parameter) and `Quoted-Printable`-decodes it. The return value is a ‘byte string’, i.e. a string of which each item represents an octet as per the character encoding that’s being used. Here’s an example that uses UTF-8:

```js
var utf8 = require('utf8');

utf8.decode(quotedPrintable.decode('foo=3Dbar'));
// → 'foo=bar'

utf8.decode(quotedPrintable.decode('I=C3=B1t=C3=ABrn=C3=A2ti=C3=B4n=C3=A0liz=C3=A6ti=C3=B8n=E2=98=83=F0=9F=92=\r\n=A9'));
// → 'Iñtërnâtiônàlizætiøn☃💩'
```

### Using the `quoted-printable` binary

To use the `quoted-printable` binary in your shell, simply install _quoted-printable_ globally using npm:

```bash
npm install -g quoted-printable
```

After that, you’ll be able to use `quoted-printable` on the command line. Note that while the _quoted-printable_ library itself is character encoding–agnostic, the command-line tool applies the UTF-8 character encoding on all input.

```bash
$ quoted-printable --encode 'foo=bar'
foo=3Dbar

$ quoted-printable --decode 'foo=3Dbar'
foo=bar
```

Read a local text file, `Quoted-Printable`-encode it, and save the result to a new file:

```bash
$ quoted-printable --encode < foo.txt > foo-quoted-printable.txt
```

Or do the same with an online text file:

```bash
$ curl -sL 'https://mths.be/brh' | quoted-printable --encode > quoted-printable.txt
```

Or, the opposite — read a local file containing a `Quoted-Printable`-encoded message, decode it back to plain text, and save the result to a new file:

```bash
$ quoted-printable --decode < quoted-printable.txt > original.txt
```

See `quoted-printable --help` for the full list of options.

## Support

_quoted-printable_ is designed to work in at least Node.js v0.10.0, io.js v1.0.0, Narwhal 0.3.2, RingoJS 0.8-0.11, PhantomJS 1.9.0, Rhino 1.7RC4, as well as old and modern versions of Chrome, Firefox, Safari, Opera, and Internet Explorer.

## Unit tests & code coverage

After cloning this repository, run `npm install` to install the dependencies needed for development and testing. You may want to install Istanbul _globally_ using `npm install istanbul -g`.

Once that’s done, you can run the unit tests in Node using `npm test` or `node tests/tests.js`. To run the tests in Rhino, Ringo, Narwhal, and web browsers as well, use `grunt test`.

To generate the code coverage report, use `grunt cover`.

## Author

| [![twitter/mathias](https://gravatar.com/avatar/24e08a9ea84deb17ae121074d0f17125?s=70)](https://twitter.com/mathias "Follow @mathias on Twitter") |
|---|
| [Mathias Bynens](https://mathiasbynens.be/) |

## License

_quoted-printable_ is available under the [MIT](https://mths.be/mit) license.
