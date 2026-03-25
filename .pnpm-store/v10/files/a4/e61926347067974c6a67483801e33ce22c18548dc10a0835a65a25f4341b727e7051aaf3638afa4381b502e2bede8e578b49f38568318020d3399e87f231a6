# encoding-sniffer [![Node.js CI](https://github.com/fb55/encoding-sniffer/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/encoding-sniffer/actions/workflows/nodejs-test.yml)

An implementation of the HTML encoding sniffer algo, with stream support.

This module wraps around [iconv-lite](https://github.com/ashtuchkin/iconv-lite)
to make decoding buffers and streams incredibly easy.

## Features

-   Support for streams
-   Support for XML encoding types, including UTF-16 prefixes and
    `<?xml encoding="...">`
-   Allows decoding streams and buffers with a single function call

## Installation

```bash
npm install encoding-sniffer
```

## Usage

```js
import { DecodeStream, getEncoding, decodeBuffer } from "encoding-sniffer";

/**
 * All functions accept an optional options object.
 *
 * Available options are (with default values):
 */
const options = {
    /**
     * The maximum number of bytes to sniff. Defaults to `1024`.
     */
    maxBytes: 1024,
    /**
     * The encoding specified by the user. If set, this will only be overridden
     * by a Byte Order Mark (BOM).
     */
    userEncoding: undefined,
    /**
     * The encoding specified by the transport layer. If set, this will only be
     * overridden by a Byte Order Mark (BOM) or the user encoding.
     */
    transportLayerEncodingLabel: undefined,
    /**
     * The default encoding to use, if no encoding can be detected.
     *
     * Defaults to `"windows-1252"`.
     */
    defaultEncoding: "windows-1252",
};

// Use the `DecodeStream` transform stream to automatically decode
// the contents of a stream as they are read
const decodeStream = new DecodeStream(options);

// Or, use the `getEncoding` function to detect the encoding of a buffer
const encoding = getEncoding(buffer, options);

// Use the `decodeBuffer` function to decode the contents of a buffer
const decodedBuffer = decodeBuffer(buffer, options);
```

## License

This project is licensed under the MIT License. See the [LICENSE](/LICENSE) file
for more information.
