[![CI](https://github.com/Borewit/text-codec/actions/workflows/ci.yml/badge.svg)](https://github.com/Borewit/text-codec/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40borewit%2Ftext-codec.svg)](https://www.npmjs.com/package/@borewit/text-codec)
[![npm downloads](http://img.shields.io/npm/dm/@borewit/text-codec.svg)](https://npmcharts.com/compare/@borewit/text-codec?interval=30)
![bundlejs](https://deno.bundlejs.com/?q=@borewit/text-codec&badge)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?logo=open-source-initiative&logoColor=white)](LICENSE.txt)

# `@borewit/text-codec`

A **lightweight polyfill for text encoders and decoders** covering a small set of commonly used encodings.

Some JavaScript runtimes provide limited or inconsistent encoding support through `TextEncoder` and `TextDecoder`.  
Examples include environments like **Hermes (React Native)** or certain **Node.js builds with limited ICU support**.

This module provides **reliable encode/decode support for a small set of encodings that may be missing or unreliable in those environments**.

- If a native UTF-8 `TextEncoder` / `TextDecoder` is available, it is used.
- All other encodings are implemented by this library.

## Supported encodings

- `utf-8` / `utf8`
- `utf-16le`
- `ascii`
- `latin1` / `iso-8859-1`
- `windows-1252`

These encodings are commonly encountered in metadata formats and legacy text data.

## ✨ Features

- Encoding and decoding utilities
- Lightweight
- Typed API

## 📦 Installation

```sh
npm install @borewit/text-codec
```

# 📚 API Documentation

## `textDecode(bytes, encoding): string`

Decodes binary data into a JavaScript string.

**Parameters**
- `bytes` (`Uint8Array`) — The binary data to decode.
- `encoding` (`SupportedEncoding`, optional) — Encoding type. Defaults to `"utf-8"`.  

**Returns**
- `string` — The decoded text.

**Example**
```js
import { textDecode } from "@borewit/text-codec";

const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
const text = textDecode(bytes, "ascii");
console.log(text); // "Hello"
```

## `textEncode(input, encoding): Uint8Array`

Encodes a JavaScript string into binary form using the specified encoding.

**Parameters**

- `input` (`string`) — The string to encode.
- `encoding` (`SupportedEncoding`, optional) — Encoding type. Defaults to `"utf-8"`.

**Returns**

`Uint8Array` — The encoded binary data.

Example:
```js
import { textEncode } from "@borewit/text-codec";

const bytes = textEncode("Hello", "utf-16le");
console.log(bytes); // Uint8Array([...])
```

## 📜 Licence

This project is licensed under the [MIT License](LICENSE.txt). Feel free to use, modify, and distribute as needed.
 