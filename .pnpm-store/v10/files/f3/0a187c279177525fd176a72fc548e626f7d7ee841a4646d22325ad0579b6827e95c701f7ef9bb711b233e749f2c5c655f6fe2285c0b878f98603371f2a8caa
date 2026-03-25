# One INI

The core implementation of an AST based, idiomatic INI parser which aims to provide an easy to implement and consistent INI-standard.

This reference implementation is provided as Rust-library and WASM-package.

<!-- markdownlint-disable -->

[![GitHub Actions](https://github.com/jedmao/editorconfig-ini/workflows/Rust/badge.svg?event=push)](https://github.com/jedmao/editorconfig-ini/actions)

<!-- markdownlint-restore -->

<!-- markdownlint-disable commands-show-output -->

The work on this project started with the search for an universal parser for the [EditorConfig INI file format specification](https://editorconfig-specification.readthedocs.io/en/latest/#id3).

## WASM

To use from [Web Assembly](https://webassembly.org/), compile with:

```sh
wasm-pack build --release --target nodejs
```

and run the (limited) WASM tests with:

```sh
wasm-pack test --node
```

You can call the genereted JS wrapper with either:

```js
import { parse_to_json } from './pkg/editorconfig_ini.js'

const results = parse_to_json(`
root = true

[*]
# always use unix line endings
end_of_line = lf
`)

// {
//   "version": "0.1.0",
//   "body": [
//     { "type": "Pair", "key": "root", "value": "true" },
//     {
//       "type": "Section",
//       "name": "*",
//       "body": [
//         { "type": "Comment", "indicator": "#", "value": "always use unix line endings" },
//         { "type": "Pair", "key": "end_of_line", "value": "lf" }
//       ]
//     }
//   ]
// }
```

or:

```js
import { parse_to_uint32array, TokenTypes } from './pkg/editorconfig_ini.js'
const buf = Buffer.from(`
root = true

[*]
# always use unix line endings
end_of_line = lf
`, 'utf8')
const ary = parse_to_uint32array(buf)

// Array with token type, start byte offset, end byte offset for each token
// Uint32Array(21) [
//   TokenTypes.Key, 1, 5,
//   TokenTypes.Value, 8, 12,
//   TokenTypes.Section, 15, 16,
//   TokenTypes.CommentIndicator, 18, 19,
//   TokenTypes.CommentValue, 20, 48,
//   TokenTypes.Key, 49, 60,
//   TokenTypes.Value, 63, 65
// ]
```
