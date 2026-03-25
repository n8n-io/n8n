# forwarded-parse

[![Version npm][npm-forwarded-parse-badge]][npm-forwarded-parse]
[![Build Status][ci-forwarded-parse-badge]][ci-forwarded-parse]
[![Coverage Status][coverage-forwarded-parse-badge]][coverage-forwarded-parse]

Parse the `Forwarded` header ([RFC 7239][rfc7239]) into an array of objects.

## Install

```
npm install --save forwarded-parse
```

## API

This module exports a single function that takes a string and returns an array
of objects.

### `parse(text)`

#### Arguments

- `text` - The header field value.

#### Return value

An array of objects, one for each set of parameters added by a proxy.

#### Exceptions

Throws a `ParseError` exception if the header field value is invalid.

#### Example

```js
var parse = require('forwarded-parse');

console.log(
  parse('for=198.51.100.17;by=203.0.113.60;proto=http;host=example.com')
);

/*
[{
  for: '198.51.100.17',
  by: '203.0.113.60',
  proto: 'http',
  host: 'example.com'
}]
*/
```

## License

[MIT](LICENSE)

[npm-forwarded-parse-badge]: https://img.shields.io/npm/v/forwarded-parse.svg
[npm-forwarded-parse]: https://www.npmjs.com/package/forwarded-parse
[ci-forwarded-parse-badge]:
  https://img.shields.io/github/workflow/status/lpinca/forwarded-parse/CI/master?label=CI
[ci-forwarded-parse]:
  https://github.com/lpinca/forwarded-parse/actions?query=workflow%3ACI+branch%3Amaster
[coverage-forwarded-parse-badge]:
  https://img.shields.io/coveralls/lpinca/forwarded-parse/master.svg
[coverage-forwarded-parse]:
  https://coveralls.io/r/lpinca/forwarded-parse?branch=master
[rfc7239]: https://datatracker.ietf.org/doc/html/rfc7239
