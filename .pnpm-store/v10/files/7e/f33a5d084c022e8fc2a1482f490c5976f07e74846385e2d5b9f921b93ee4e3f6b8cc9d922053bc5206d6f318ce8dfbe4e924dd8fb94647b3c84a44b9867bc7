# utf-8-validate

[![Version npm](https://img.shields.io/npm/v/utf-8-validate.svg?logo=npm)](https://www.npmjs.com/package/utf-8-validate)
[![Linux/macOS/Windows Build](https://img.shields.io/github/workflow/status/websockets/utf-8-validate/CI/master?label=build&logo=github)](https://github.com/websockets/utf-8-validate/actions?query=workflow%3ACI+branch%3Amaster)

Check if a buffer contains valid UTF-8 encoded text.

## Installation

```
npm install utf-8-validate --save-optional
```

The `--save-optional` flag tells npm to save the package in your package.json
under the
[`optionalDependencies`](https://docs.npmjs.com/files/package.json#optionaldependencies)
key.

## API

The module exports a single function which takes one argument.

### `isValidUTF8(buffer)`

Checks whether a buffer contains valid UTF-8.

#### Arguments

- `buffer` - The buffer to check.

#### Return value

`true` if the buffer contains only correct UTF-8, else `false`.

#### Example

```js
'use strict';

const isValidUTF8 = require('utf-8-validate');

const buf = Buffer.from([0xf0, 0x90, 0x80, 0x80]);

console.log(isValidUTF8(buf));
// => true
```

## License

[MIT](LICENSE)
