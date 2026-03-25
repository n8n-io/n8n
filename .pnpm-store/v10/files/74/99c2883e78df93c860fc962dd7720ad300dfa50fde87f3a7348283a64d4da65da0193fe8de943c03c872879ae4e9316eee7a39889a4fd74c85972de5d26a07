# FormData

Spec-compliant [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) implementation for Node.js

[![Code Coverage](https://codecov.io/github/octet-stream/form-data/coverage.svg?branch=main)](https://codecov.io/github/octet-stream/form-data?branch=main)
[![CI](https://github.com/octet-stream/form-data/workflows/CI/badge.svg)](https://github.com/octet-stream/form-data/actions/workflows/ci.yml)
[![ESLint](https://github.com/octet-stream/form-data/workflows/ESLint/badge.svg)](https://github.com/octet-stream/form-data/actions/workflows/eslint.yml)
[![TypeScript Types](https://github.com/octet-stream/form-data/actions/workflows/typescript.yml/badge.svg)](https://github.com/octet-stream/form-data/actions/workflows/typescript.yml)

## Requirements

For this module to work consider polyfilling: [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream), and [DOMException](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) (if you use `file-from-path` utilities)

## Highlights

1. Spec-compliant: implements every method of the [`FormData interface`](https://developer.mozilla.org/en-US/docs/Web/API/FormData).
2. Supports Blobs and Files sourced from anywhere: you can use builtin [`fileFromPath`](#filefrompathpath-filename-options---promisefile) and [`fileFromPathSync`](#filefrompathsyncpath-filename-options---file) helpers to create a File from FS, or you can implement your `BlobDataItem` object to use a different source of data.
3. Written on TypeScript and ships with TS typings.
4. Isomorphic, but only re-exports native FormData object for browsers. If you need a polyfill for browsers, use [`formdata-polyfill`](https://github.com/jimmywarting/FormData)
5. It's a [`ponyfill`](https://ponyfill.com/)! Which means, no effect has been caused on `globalThis` or native `FormData` implementation.

## Blob/File support

While `formdata-node` ships with its own `File` and `Blob` implementations, these might eventually be removed in favour of Node.js' [`Blob`](https://nodejs.org/dist/latest-v18.x/docs/api/buffer.html#class-blob) (introduced in v14.18) and File (when it will be introduced). In order to help you smoothen that transition period, our own `Blob` and `File`, as well as `FormData` itself, provides support `Blob` objects created by Node.js' implementation.

## Installation

You can install this package with npm:

```
npm install formdata-node
```

Or yarn:

```
yarn add formdata-node
```

Or pnpm

```
pnpm add formdata-node
```

## ESM/CJS support

This package is build for and bundled for both ESM and CommonJS, so you can use it in both environments.

## Usage

1. Let's take a look at minimal example with [got](https://github.com/sindresorhus/got):

```js
import {FormData} from "formdata-node"

// I assume Got >= 12.x is used for this example
import got from "got"

const form = new FormData()

form.set("greeting", "Hello, World!")

const data = await got.post("https://httpbin.org/post", {body: form}).json()

console.log(data.form.greeting) // => Hello, World!
```

2. If your HTTP client does not support spec-compliant FormData, you can use [`form-data-encoder`](https://github.com/octet-stream/form-data-encoder) to encode entries:

```js
import {Readable} from "stream"

import {FormDataEncoder} from "form-data-encoder"
import {FormData} from "formdata-node"

// Note that `node-fetch` >= 3.x have builtin support for spec-compliant FormData, sou you'll only need the `form-data-encoder` if you use `node-fetch` <= 2.x.
import fetch from "node-fetch"

const form = new FormData()

form.set("field", "Some value")

const encoder = new FormDataEncoder(form)

const options = {
  method: "post",
  headers: encoder.headers,
  body: Readable.from(encoder)
}

await fetch("https://httpbin.org/post", options)
```

3. Sending files over form-data:

```js
import {FormData, File} from "formdata-node" // You can use `File` from fetch-blob >= 3.x

import fetch from "node-fetch"

const form = new FormData()
const file = new File(["My hovercraft is full of eels"], "file.txt")

form.set("file", file)

await fetch("https://httpbin.org/post", {method: "post", body: form})
```

4. Blobs as field's values allowed too:

```js
import {FormData, Blob} from "formdata-node" // You can use `Blob` from fetch-blob

const form = new FormData()
const blob = new Blob(["Some content"], {type: "text/plain"})

form.set("blob", blob)

// Will always be returned as `File`
let file = form.get("blob")

// The created file has "blob" as the name by default
console.log(file.name) // -> blob

// To change that, you need to set filename argument manually
form.set("file", blob, "some-file.txt")

file = form.get("file")

console.log(file.name) // -> some-file.txt
```

5. You can use 3rd party Blob as FormData value, as vell as for BlobParts in out Blob implementation:

```js
import {FormData, Blob} from "formdata-node"
import {Blob as FetchBlob} from "fetch-blob"

const input = new FetchBlob(["a", "b", "c"])

const blob = new Blob([input]) // Accepts 3rd party blobs as BlobParts

await blob.text() // -> abc

const form = new FormData()

form.set("file", input)

const file = form.get("file") // -> File

await file.text() // -> abc
```

6. You can also use Node.js' Blob implementation in these scenarios:

```js
import {Blob as NodeBlob} from "node:buffer"

import {FormData, Blob} from "formdata-node"

const input = new NodeBlob(["a", "b", "c"])

const blob = new Blob([input]) // Accepts Node.js' Blob implementation as BlobParts

await blob.text() // -> abc

const form = new FormData()

form.set("file", input)

const file = form.get("file") // -> File

await file.text() // -> abc
```

7. You can also append files using `fileFromPath` or `fileFromPathSync` helpers. It does the same thing as [`fetch-blob/from`](https://github.com/node-fetch/fetch-blob#blob-part-backed-up-by-filesystem), but returns a `File` instead of `Blob`:

```js
import {fileFromPath} from "formdata-node/file-from-path"
import {FormData} from "formdata-node"

import fetch from "node-fetch"

const form = new FormData()

form.set("file", await fileFromPath("/path/to/a/file"))

await fetch("https://httpbin.org/post", {method: "post", body: form})
```

8. You can still use files sourced from any stream, but unlike in v2 you'll need some extra work to achieve that:

```js
import {Readable} from "stream"

import {FormData} from "formdata-node"

class BlobFromStream {
  #stream

  constructor(stream, size) {
    this.#stream = stream
    this.size = size
  }

  stream() {
    return this.#stream
  }

  get [Symbol.toStringTag]() {
    return "Blob"
  }
}

const content = Buffer.from("Stream content")

const stream = new Readable({
  read() {
    this.push(content)
    this.push(null)
  }
})

const form = new FormData()

form.set("stream", new BlobFromStream(stream, content.length), "file.txt")

await fetch("https://httpbin.org/post", {method: "post", body: form})
```

9. Note that if you don't know the length of that stream, you'll also need to handle form-data encoding manually or use [`form-data-encoder`](https://github.com/octet-stream/form-data-encoder) package. This is necessary to control which headers will be sent with your HTTP request:

```js
import {Readable} from "stream"

import {Encoder} from "form-data-encoder"
import {FormData} from "formdata-node"

const form = new FormData()

// You can use file-shaped or blob-shaped objects as FormData value instead of creating separate class
form.set("stream", {
  type: "text/plain",
  name: "file.txt",
  [Symbol.toStringTag]: "File",
  stream() {
    return getStreamFromSomewhere()
  }
})

const encoder = new Encoder(form)

const options = {
  method: "post",
  headers: {
    "content-type": encoder.contentType
  },
  body: Readable.from(encoder)
}

await fetch("https://httpbin.org/post", {method: "post", body: form})
```

## Comparison

|                  | formdata-node | formdata-polyfill | undici FormData | form-data            |
| ---------------- | ------------- | ----------------- | --------------- | -------------------- |
| .append()        | ✔️             | ✔️                 | ✔️               | ✔️<sup>1</sup>        |
| .set()           | ✔️             | ✔️                 | ✔️               | ❌                   |
| .get()           | ✔️             | ✔️                 | ✔️               | ❌                   |
| .getAll()        | ✔️             | ✔️                 | ✔️               | ❌                   |
| .forEach()       | ✔️             | ✔️                 | ✔️               | ❌                   |
| .keys()          | ✔️             | ✔️                 | ✔️               | ❌                   |
| .values()        | ✔️             | ✔️                 | ✔️               | ❌                   |
| .entries()       | ✔️             | ✔️                 | ✔️               | ❌                   |
| Symbol.iterator  | ✔️             | ✔️                 | ✔️               | ❌                   |
| ESM              | ✔️             | ✔️                 | ✔️<sup>2</sup>   | ✔️<sup>2</sup>        |
| Blob             | ✔️<sup>3</sup> | ✔️<sup>4</sup>     | ✔️<sup>3</sup>   | ❌                   |
| Browser polyfill | ❌            | ✔️                 | ✔️               | ❌                   |
| Builtin encoder  | ❌            | ✔️                 | ✔️<sup>5</sup>   | ✔️                    |

<sup>1</sup> Does not support Blob and File in entry value, but allows streams and Buffer (which is not spec-compliant, however).

<sup>2</sup> Can be imported in ESM, because Node.js support for CJS modules in ESM context, but it does not have ESM entry point.

<sup>3</sup> Have builtin implementations of Blob and/or File, allows native Blob and File as entry value.

<sup>4</sup> Support Blob and File via fetch-blob package, allows native Blob and File as entry value.

<sup>5</sup> Have `multipart/form-data` encoder as part of their `fetch` implementation.

✔️ - For FormData methods, indicates that the method is present and spec-compliant. For features, shows its presence.

❌ - Indicates that method or feature is not implemented.

## API

### `class FormData`

##### `constructor() -> {FormData}`

Creates a new FormData instance.

#### Instance methods

##### `set(name, value[, filename]) -> {void}`

Set a new value for an existing key inside **FormData**,
or add the new field if it does not already exist.

  - **{string}** name – The name of the field whose data is contained in `value`.
  - **{unknown}** value – The field's value. This can be [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
    or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File). If none of these are specified the value is converted to a string.
  - **{string}** [filename = undefined] – The filename reported to the server, when a Blob or File is passed as the second parameter. The default filename for Blob objects is "blob". The default filename for File objects is the file's filename.

##### `append(name, value[, filename]) -> {void}`

Appends a new value onto an existing key inside a FormData object,
or adds the key if it does not already exist.

The difference between `set()` and `append()` is that if the specified key already exists, `set()` will overwrite all existing values with the new one, whereas `append()` will append the new value onto the end of the existing set of values.

  - **{string}** name – The name of the field whose data is contained in `value`.
  - **{unknown}** value – The field's value. This can be [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
    or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File). If none of these are specified the value is converted to a string.
  - **{string}** [filename = undefined] – The filename reported to the server, when a Blob or File is passed as the second parameter. The default filename for Blob objects is "blob". The default filename for File objects is the file's filename.

##### `get(name) -> {FormDataValue}`

Returns the first value associated with a given key from within a `FormData` object.
If you expect multiple values and want all of them, use the `getAll()` method instead.

  - **{string}** name – A name of the value you want to retrieve.

##### `getAll(name) -> {Array<FormDataValue>}`

Returns all the values associated with a given key from within a `FormData` object.

  - **{string}** name – A name of the value you want to retrieve.

##### `has(name) -> {boolean}`

Returns a boolean stating whether a `FormData` object contains a certain key.

  - **{string}** – A string representing the name of the key you want to test for.

##### `delete(name) -> {void}`

Deletes a key and its value(s) from a `FormData` object.

  - **{string}** name – The name of the key you want to delete.

##### `forEach(callback[, thisArg]) -> {void}`

Executes a given **callback** for each field of the FormData instance

  - **{function}** callback – Function to execute for each element, taking three arguments:
    + **{FormDataValue}** value – A value(s) of the current field.
    + **{string}** name – Name of the current field.
    + **{FormData}** form – The FormData instance that **forEach** is being applied to
  - **{unknown}** [thisArg = null] – Value to use as **this** context when executing the given **callback**

##### `keys() -> {Generator<string>}`

Returns an [`iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) allowing to go through all keys contained in this `FormData` object.
Each key is a `string`.

##### `values() -> {Generator<FormDataValue>}`

Returns an [`iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) allowing to go through all values contained in this object `FormData` object.
Each value is a [`FormDataValue`](https://developer.mozilla.org/en-US/docs/Web/API/FormDataEntryValue).

##### `entries() -> {Generator<[string, FormDataValue]>}`

Returns an [`iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) allowing to go through key/value pairs contained in this `FormData` object.
The key of each pair is a string; the value is a [`FormDataValue`](https://developer.mozilla.org/en-US/docs/Web/API/FormDataEntryValue).

##### `[Symbol.iterator]() -> {Generator<[string, FormDataValue]>}`

An alias for [`FormData#entries()`](#entries---iterator)

### `class Blob`

The `Blob` object represents a blob, which is a file-like object of immutable, raw data;
they can be read as text or binary data, or converted into a ReadableStream
so its methods can be used for processing the data.

##### `constructor(blobParts[, options]) -> {Blob}`

Creates a new `Blob` instance. The `Blob` constructor accepts following arguments:

  - **{(ArrayBufferLike | ArrayBufferView | File | Blob | string)[]}** blobParts – An `Array` strings, or [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`ArrayBufferView`](https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView), [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, or a mix of any of such objects, that will be put inside the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob);
  - **{object}** [options = {}] - An options object containing optional attributes for the file. Available options are as follows;
  - **{string}** [options.type = ""] - Returns the media type ([`MIME`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)) of the blob represented by a `Blob` object.

#### Instance properties

##### `type -> {string}`

Returns the [`MIME type`](https://developer.mozilla.org/en-US/docs/Glossary/MIME_type) of the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File).

##### `size -> {number}`

Returns the size of the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) in bytes.

#### Instance methods

##### `slice([start, end, contentType]) -> {Blob}`

Creates and returns a new [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) object which contains data from a subset of the blob on which it's called.

- **{number}** [start = 0] An index into the `Blob` indicating the first byte to include in the new `Blob`. If you specify a negative value, it's treated as an offset from the end of the `Blob` toward the beginning. For example, -10 would be the 10th from last byte in the `Blob`. The default value is 0. If you specify a value for start that is larger than the size of the source `Blob`, the returned `Blob` has size 0 and contains no data.

- **{number}** [end = `blob`.size] An index into the `Blob` indicating the first byte that will *not* be included in the new `Blob` (i.e. the byte exactly at this index is not included). If you specify a negative value, it's treated as an offset from the end of the `Blob` toward the beginning. For example, -10 would be the 10th from last byte in the `Blob`. The default value is size.

- **{string}** [contentType = ""] The content type to assign to the new ``Blob``; this will be the value of its type property. The default value is an empty string.

##### `stream() -> {ReadableStream<Uint8Array>}`

Returns a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) which upon reading returns the data contained within the [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

##### `arrayBuffer() -> {Promise<ArrayBuffer>}`

Returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves with the contents of the blob as binary data contained in an [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer).

##### `text() -> {Promise<string>}`

Returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves with a string containing the contents of the blob, interpreted as UTF-8.

### `class File extends Blob`

The `File` class provides information about files. The `File` class inherits `Blob`.

##### `constructor(fileBits, filename[, options]) -> {File}`

Creates a new `File` instance. The `File` constructor accepts following arguments:

  - **{(ArrayBufferLike | ArrayBufferView | File | Blob | string)[]}** fileBits – An `Array` strings, or [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [`ArrayBufferView`](https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView), [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, or a mix of any of such objects, that will be put inside the [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File);
  - **{string}** filename – Representing the file name.
  - **{object}** [options = {}] - An options object containing optional attributes for the file. Available options are as follows;
  - **{number}** [options.lastModified = Date.now()] – provides the last modified date of the file as the number of milliseconds since the Unix epoch (January 1, 1970 at midnight). Files without a known last modified date return the current date;
  - **{string}** [options.type = ""] - Returns the media type ([`MIME`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)) of the file represented by a `File` object.

### `fileFromPath(path[, filename, options]) -> {Promise<File>}`

Available from `formdata-node/file-from-path` subpath.

Creates a `File` referencing the one on a disk by given path.

  - **{string}** path - Path to a file
  - **{string}** [filename] - Optional name of the file. Will be passed as the second argument in `File` constructor. If not presented, the name will be taken from the file's path.
  - **{object}** [options = {}] - Additional `File` options, except for `lastModified`.
  - **{string}** [options.type = ""] - Returns the media type ([`MIME`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)) of the file represented by a `File` object.

### `fileFromPathSync(path[, filename, options]) -> {File}`

Available from `formdata-node/file-from-path` subpath.

Creates a `File` referencing the one on a disk by given path. Synchronous version of the `fileFromPath`.
  - **{string}** path - Path to a file
  - **{string}** [filename] - Optional name of the file. Will be passed as the second argument in `File` constructor. If not presented, the name will be taken from the file's path.
  - **{object}** [options = {}] - Additional `File` options, except for `lastModified`.
  - **{string}** [options.type = ""] - Returns the media type ([`MIME`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)) of the file represented by a `File` object.

### `isFile(value) -> {boolean}`

Available from `formdata-node/file-from-path` subpath.

Checks if given value is a File, Blob or file-look-a-like object.

  - **{unknown}** value - A value to test

## Related links

- [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) documentation on MDN
- [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) documentation on MDN
- [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) documentation on MDN
- [`FormDataValue`](https://developer.mozilla.org/en-US/docs/Web/API/FormDataEntryValue) documentation on MDN.
- [`formdata-polyfill`](https://github.com/jimmywarting/FormData) HTML5 `FormData` for Browsers & NodeJS.
- [`node-fetch`](https://github.com/node-fetch/node-fetch) a light-weight module that brings the Fetch API to Node.js
- [`fetch-blob`](https://github.com/node-fetch/fetch-blob) a Blob implementation on node.js, originally from `node-fetch`.
- [`form-data-encoder`](https://github.com/octet-stream/form-data-encoder) spec-compliant `multipart/form-data` encoder implementation.
- [`then-busboy`](https://github.com/octet-stream/then-busboy) a promise-based wrapper around Busboy. Process multipart/form-data content and returns it as a single object. Will be helpful to handle your data on the server-side applications.
- [`@octetstream/object-to-form-data`](https://github.com/octet-stream/object-to-form-data) converts JavaScript object to FormData.
