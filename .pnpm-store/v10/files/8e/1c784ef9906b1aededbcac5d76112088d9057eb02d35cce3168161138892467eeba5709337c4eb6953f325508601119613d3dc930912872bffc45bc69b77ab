[![Node.js CI](https://github.com/Borewit/strtok3/actions/workflows/ci.yml/badge.svg)](https://github.com/Borewit/strtok3/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Borewit/strtok3/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/Borewit/strtok3/actions/workflows/codeql.yml)
[![NPM version](https://badge.fury.io/js/strtok3.svg)](https://npmjs.org/package/strtok3)
[![npm downloads](http://img.shields.io/npm/dm/strtok3.svg)](https://npmcharts.com/compare/strtok3,token-types?start=1200&interval=30)
[![DeepScan grade](https://deepscan.io/api/teams/5165/projects/8526/branches/103329/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5165&pid=8526&bid=103329)
[![Known Vulnerabilities](https://snyk.io/test/github/Borewit/strtok3/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Borewit/strtok3?targetFile=package.json)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/59dd6795e61949fb97066ca52e6097ef)](https://www.codacy.com/app/Borewit/strtok3?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Borewit/strtok3&amp;utm_campaign=Badge_Grade)
# strtok3

A promise based streaming [*tokenizer*](#tokenizer-object) for [Node.js](http://nodejs.org) and browsers.

The `strtok3` module provides several methods for creating a [*tokenizer*](#tokenizer-object) from various input sources. 
Designed for:
* Seamless support in streaming environments.
* Efficiently decode binary data, strings, and numbers.
* Reading [predefined](https://github.com/Borewit/token-types) or custom tokens.
* Offering [*tokenizers*](#tokenizer-object) for reading from [files](#method-strtok3fromfile), [streams](#fromstream-function) or [Uint8Arrays](#frombuffer-function).

### Features
`strtok3` can read from:
* Files, using a file path as input.
* Node.js [streams](https://nodejs.org/api/stream.html).
* [Buffer](https://nodejs.org/api/buffer.html) or [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array).
* HTTP chunked transfer provided by [@tokenizer/http](https://github.com/Borewit/tokenizer-http).
* [Amazon S3](https://aws.amazon.com/s3) chunks with [@tokenizer/s3](https://github.com/Borewit/tokenizer-s3).

## Installation

```sh
npm install strtok3
```

### Compatibility

Starting with version 7, the module has migrated from [CommonJS](https://en.wikipedia.org/wiki/CommonJS) to [pure ECMAScript Module (ESM)](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
The distributed JavaScript codebase is compliant with the [ECMAScript 2020 (11th Edition)](https://en.wikipedia.org/wiki/ECMAScript_version_history#11th_Edition_%E2%80%93_ECMAScript_2020) standard.

Requires a modern browser, Node.js (V8) ≥ 18 engine or Bun (JavaScriptCore) ≥ 1.2.

For TypeScript CommonJs backward compatibility, you can use [load-esm](https://github.com/Borewit/load-esm).

> [!NOTE]
> This module requires a [Node.js ≥ 16](https://nodejs.org/en/about/previous-releases) engine.
> It can also be used in a browser environment when bundled with a module bundler.

## Support the Project
If you find this project useful and would like to support its development, consider sponsoring or contributing:

- [Become a sponsor to Borewit](https://github.com/sponsors/Borewit)

- Buy me a coffee:

  <a href="https://www.buymeacoffee.com/borewit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy me A coffee" height="41" width="174"></a>

## API Documentation

### strtok3 methods

Use one of the methods to instantiate an [*abstract tokenizer*](#tokenizer-object):
- [fromBlob](#fromblob-function)
- [fromBuffer](#frombuffer-function)
- [fromFile](#fromfile-function)*
- [fromStream](#fromstream-function)*
- [fromWebStream](#fromwebstream-function)

> [!NOTE]
> `fromFile` and `fromStream`  only available when importing this module with Node.js

All methods return a [`Tokenizer`](#tokenizer-object), either directly or via a promise.

#### `fromBlob()` function

Create a tokenizer from a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

```ts
function fromBlob(blob: Blob, options?: ITokenizerOptions): BlobTokenizer
```

| Parameter | Optional  | Type                                              | Description                                                                            |
|-----------|-----------|---------------------------------------------------|----------------------------------------------------------------------------------------|
| blob      | no        | [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)  | [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [File](https://developer.mozilla.org/en-US/docs/Web/API/File) to read from |
| options   | yes       | [ITokenizerOptions](#ITokenizerOptions)           | Tokenizer options                                                                      |

Returns a [*tokenizer*](#tokenizer-object).

```js
import { fromBlob } from 'strtok3';
import { openAsBlob } from 'node:fs';
import * as Token from 'token-types';

async function parse() {
  const blob = await openAsBlob('somefile.bin');

  const tokenizer = fromBlob(blob);

  const myUint8Number = await tokenizer.readToken(Token.UINT8);
  console.log(`My number: ${myUint8Number}`);   
}

parse();

```

#### `fromBuffer()` function

Create a tokenizer from memory ([Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) or Node.js [Buffer](https://nodejs.org/api/buffer.html)).

```ts
function fromBuffer(uint8Array: Uint8Array, options?: ITokenizerOptions): BufferTokenizer
```

| Parameter  | Optional | Type                                             | Description                       |
|------------|----------|--------------------------------------------------|-----------------------------------|
| uint8Array | no       | [Uint8Array](https://nodejs.org/api/buffer.html) | Buffer or Uint8Array to read from |
| options    | yes      | [ITokenizerOptions](#ITokenizerOptions)          | Tokenizer options                 |

Returns a [*tokenizer*](#tokenizer-object).

```js
import { fromBuffer } from 'strtok3';
import * as Token from 'token-types';

const tokenizer = fromBuffer(buffer);

async function parse() {
  const myUint8Number = await tokenizer.readToken(Token.UINT8);
  console.log(`My number: ${myUint8Number}`);
}

parse();
```

#### `fromFile` function

Creates a [*tokenizer*](#tokenizer-object) from a local file.

```ts
function fromFile(sourceFilePath: string): Promise<FileTokenizer>
```  

| Parameter      | Type     | Description                |
|----------------|----------|----------------------------|
| sourceFilePath | `string` | Path to file to read from  |

> [!NOTE]
> - Only available for Node.js engines
> - `fromFile` automatically embeds [file-information](#file-information)

A Promise resolving to a [*tokenizer*](#tokenizer-object) which can be used to parse a file.

```js
import { fromFile } from 'strtok3';
import * as Token from 'token-types';

async function parse() {
  const tokenizer = await fromFile('somefile.bin');
  try {
    const myNumber = await tokenizer.readToken(Token.UINT8);
    console.log(`My number: ${myNumber}`);
  } finally {
    tokenizer.close(); // Close the file
  }
}

parse();


```

#### `fromWebStream()` function

Create a tokenizer from a [WHATWG ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

```ts
function fromWebStream(webStream: AnyWebByteStream, options?: ITokenizerOptions): ReadStreamTokenizer
```

| Parameter      | Optional | Type                                                                     | Description                        |
|----------------|----------|--------------------------------------------------------------------------|------------------------------------|
| webStream      | no       | [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) | WHATWG ReadableStream to read from |
| options        | yes      | [ITokenizerOptions](#ITokenizerOptions)                                   | Tokenizer options                  |

Returns a [*tokenizer*](#tokenizer-object).

```js
import { fromWebStream } from 'strtok3';
import * as Token from 'token-types';

async function parse() {
  const tokenizer = fromWebStream(readableStream);
  try {
    const myUint8Number = await tokenizer.readToken(Token.UINT8);
    console.log(`My number: ${myUint8Number}`);
  } finally {
    await tokenizer.close();
  }
}

parse();
```

### `Tokenizer` object
The *tokenizer* is an abstraction of a [stream](https://nodejs.org/api/stream.html), file or [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array), allowing _reading_ or _peeking_ from the stream.
It can also be translated in chunked reads, as done in [@tokenizer/http](https://github.com/Borewit/tokenizer-http);

#### Key Features:

- Supports seeking within the stream using `tokenizer.ignore()`.
- Offers `peek` methods to preview data without advancing the read pointer.
- Maintains the read position via tokenizer.position.

#### Tokenizer functions

_Read_ methods advance the stream pointer, while _peek_ methods do not.

There are two kind of functions:
1. *read* methods: used to read a *token* of [Buffer](https://nodejs.org/api/buffer.html) from the [*tokenizer*](#tokenizer-object). The position of the *tokenizer-stream* will advance with the size of the token.
2. *peek* methods: same as the read, but it will *not* advance the pointer. It allows to read (peek) ahead.

#### `readBuffer` function

Read data from the _tokenizer_ into provided "buffer" (`Uint8Array`).
`readBuffer(buffer, options?)`

```ts
readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number>;
```

| Parameter  | Type                                                           | Description                                                                                                                                                                                                                            |
|------------|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| buffer     | [Buffer](https://nodejs.org/api/buffer.html) &#124; Uint8Array | Target buffer to write the data read to                                                                                                                                                                                                |
| options    | [IReadChunkOptions](#ireadchunkoptions-interface)                        | An integer specifying the number of bytes to read                                                                                                                                                                                      |

Return promise with number of bytes read.
The number of bytes read may be less than requested if the `mayBeLess` flag is set.

#### `peekBuffer` function

Peek (read ahead), from [*tokenizer*](#tokenizer-object), into the buffer without advancing the stream pointer.

```ts
peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
```

| Parameter  | Type                                    | Description                                         |
|------------|-----------------------------------------|-----------------------------------------------------|
| buffer     | Buffer &#124; Uint8Array                | Target buffer to write the data read (peeked) to.   |
| options    | [IReadChunkOptions](#ireadchunkoptions-interface) | An integer specifying the number of bytes to read.  |                                                                                                                           |

Return value `Promise<number>` Promise with number of bytes read. The number of bytes read may be less if the `mayBeLess` flag was set.

#### `readToken` function

Read a *token* from the tokenizer-stream.

```ts
readToken<Value>(token: IGetToken<Value>, position: number = this.position): Promise<Value>
```  

| Parameter  | Type                    | Description                                                                                                           |
|------------|-------------------------|---------------------------------------------------------------------------------------------------------------------- |
| token      | [IGetToken](#IGetToken) | Token to read from the tokenizer-stream.                                                                              |
| position?  | number                  | Offset where to begin reading within the file. If position is null, data will be read from the current file position. |

Return value `Promise<number>`. Promise with number of bytes read. The number of bytes read maybe if less, `mayBeLess` flag was set.

#### `peek` function

Peek a *token* from the [*tokenizer*](#tokenizer-object).

```ts
peekToken<Value>(token: IGetToken<Value>, position: number = this.position): Promise<Value>
```

| Parameter  | Type                       | Description                                                                                                             |
|------------|----------------------------|-------------------------------------------------------------------------------------------------------------------------|
| token      | [IGetToken<T>](#IGetToken) | Token to read from the tokenizer-stream.                                                                                |
| position?  | number                     | Offset where to begin reading within the file. If position is null, data will be read from the current file position.   |

Return a promise with the token value peeked from the [*tokenizer*](#tokenizer-object).

#### `readNumber` function

Read a numeric [*token*](#token) from the [*tokenizer*](#tokenizer-object).

```ts
readNumber(token: IToken<number>): Promise<number>
```

| Parameter  | Type                            | Description                                        |
|------------|---------------------------------|----------------------------------------------------|
| token      | [IGetToken<number>](#IGetToken) | Numeric token to read from the tokenizer-stream.   |

A promise resolving to a numeric value read and decoded from the *tokenizer-stream*.

#### `ignore` function

Advance the offset pointer with the token number of bytes provided.

```ts
ignore(length: number): Promise<number>
```

| Parameter  | Type   | Description                                                      |
|------------|--------|------------------------------------------------------------------|
| length     | number | Number of bytes to ignore. Will advance the `tokenizer.position` |

A promise resolving to the number of bytes ignored from the *tokenizer-stream*.

#### `close` function
Clean up resources, such as closing a file pointer if applicable.

#### `Tokenizer` attributes

- `fileInfo`

  Optional attribute describing the file information, see [IFileInfo](#IFileInfo)

- `position`

  Pointer to the current position in the [*tokenizer*](#tokenizer-object) stream.
  If a *position* is provided to a _read_ or _peek_ method, is should be, at least, equal or greater than this value.

### `IReadChunkOptions` interface

Each attribute is optional:

| Attribute | Type    | Description                                                                                                                                                                                                                   |
|-----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| length    | number  | Requested number of bytes to read.                                                                                                                                                                                            |
| position  | number  | Position where to peek from the file. If position is null, data will be read from the [current file position](#attribute-tokenizerposition). Position may not be less then [tokenizer.position](#attribute-tokenizerposition) |
| mayBeLess | boolean | If and only if set, will not throw an EOF error if less than the requested `mayBeLess` could be read.                                                                                                                         |

Example usage:
```js
  tokenizer.peekBuffer(buffer, {mayBeLess: true});
```

### `IFileInfo` interface

Provides optional metadata about the file being tokenized.

| Attribute | Type    | Description                                                                                       |
|-----------|---------|---------------------------------------------------------------------------------------------------|
| size      | number  | File size in bytes                                                                                |
| mimeType  | string  | [MIME-type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of file. |
| path      | string  | File path                                                                                         |
| url       | string  | File URL                                                                                          |

### `Token` object

The *token* is basically a description of what to read from the [*tokenizer-stream*](#tokenizer-object).
A basic set of *token types* can be found here: [*token-types*](https://github.com/Borewit/token-types).

A token is something which implements the following interface:
```ts
export interface IGetToken<T> {

  /**
   * Length in bytes of encoded value
   */
  len: number;

  /**
   * Decode value from buffer at offset
   * @param buf Buffer to read the decoded value from
   * @param off Decode offset
   */
  get(buf: Uint8Array, off: number): T;
}
```
The *tokenizer* reads `token.len` bytes from the *tokenizer-stream* into a Buffer.
The `token.get` will be called with the Buffer. `token.get` is responsible for conversion from the buffer to the desired output type.

### Working with Web-API readable stream
To convert a [Web-API readable stream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader) into a [Node.js readable stream]((https://nodejs.org/api/stream.html#stream_readable_streams)), you can use [readable-web-to-node-stream](https://github.com/Borewit/readable-web-to-node-stream) to convert one in another.

```js
import { fromWebStream } from 'strtok3';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

(async () => {

  const response = await fetch(url);
  const readableWebStream = response.body; // Web-API readable stream
  const webStream = new ReadableWebToNodeStream(readableWebStream); // convert to Node.js readable stream

  const tokenizer = fromWebStream(webStream); // And we now have tokenizer in a web environment
})();
```

## Dependencies

Dependencies:
- [@tokenizer/token](https://github.com/Borewit/tokenizer-token): Provides token definitions and utilities used by `strtok3` for interpreting binary data.

## Licence

This project is licensed under the [MIT License](LICENSE.txt). Feel free to use, modify, and distribute as needed.
