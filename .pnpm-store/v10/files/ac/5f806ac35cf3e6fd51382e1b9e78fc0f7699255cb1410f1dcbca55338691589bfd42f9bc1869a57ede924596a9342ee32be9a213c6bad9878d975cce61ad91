# uint8array-extras

> Useful utilities for working with [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) (and [`Buffer`](https://nodejs.org/api/buffer.html))

It's time to [transition from `Buffer` to `Uint8Array`](https://sindresorhus.com/blog/goodbye-nodejs-buffer), and this package helps fill in the gaps.

Note that `Buffer` is a `Uint8Array` subclass, so you can use this package with `Buffer` too.

This package is tree-shakeable and browser-compatible.

This package also includes methods to convert a string to Base64 and back.

Note: In the browser, do not use [`globalThis.atob()`](https://developer.mozilla.org/en-US/docs/Web/API/atob) / [`globalThis.btoa()`](https://developer.mozilla.org/en-US/docs/Web/API/btoa) because they [do not support Unicode](https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem). This package does.

## Install

```sh
npm install uint8array-extras
```

## Usage

```js
import {concatUint8Arrays} from 'uint8array-extras';

const a = new Uint8Array([1, 2, 3]);
const b = new Uint8Array([4, 5, 6]);

console.log(concatUint8Arrays([a, b]));
//=> Uint8Array [1, 2, 3, 4, 5, 6]
```

## API

### `isUint8Array(value: unknown): boolean`

Check if the given value is an instance of `Uint8Array`.

Replacement for [`Buffer.isBuffer()`](https://nodejs.org/api/buffer.html#static-method-bufferisbufferobj).

```js
import {isUint8Array} from 'uint8array-extras';

console.log(isUint8Array(new Uint8Array()));
//=> true

console.log(isUint8Array(Buffer.from('x')));
//=> true

console.log(isUint8Array(new ArrayBuffer(10)));
//=> false
```

### `assertUint8Array(value: unknown)`

Throw a `TypeError` if the given value is not an instance of `Uint8Array`.

```js
import {assertUint8Array} from 'uint8array-extras';

try {
	assertUint8Array(new ArrayBuffer(10)); // Throws a TypeError
} catch (error) {
	console.error(error.message);
}
```

### `assertUint8ArrayOrArrayBuffer(value: unknown)`

Throw a `TypeError` if the given value is not an instance of `Uint8Array` or `ArrayBuffer`.

Useful as a guard for functions that accept either a `Uint8Array` or `ArrayBuffer`.

```js
import {assertUint8ArrayOrArrayBuffer} from 'uint8array-extras';

assertUint8ArrayOrArrayBuffer(new Uint8Array());
assertUint8ArrayOrArrayBuffer(new ArrayBuffer(8));
```

### `toUint8Array(value: TypedArray | ArrayBuffer | DataView): Uint8Array`

Convert a value to a `Uint8Array` without copying its data.

This can be useful for converting a `Buffer` to a pure `Uint8Array`. `Buffer` is already a `Uint8Array` subclass, but [`Buffer` alters some behavior](https://sindresorhus.com/blog/goodbye-nodejs-buffer), so it can be useful to cast it to a pure `Uint8Array` before returning it.

Tip: If you want a copy, just call `.slice()` on the return value.

### `concatUint8Arrays(arrays: Uint8Array[], totalLength?: number): Uint8Array`

Concatenate the given arrays into a new array.

If `arrays` is empty, it will return a zero-sized `Uint8Array`.

If `totalLength` is not specified, it is calculated from summing the lengths of the given arrays.

Replacement for [`Buffer.concat()`](https://nodejs.org/api/buffer.html#static-method-bufferconcatlist-totallength).

```js
import {concatUint8Arrays} from 'uint8array-extras';

const a = new Uint8Array([1, 2, 3]);
const b = new Uint8Array([4, 5, 6]);

console.log(concatUint8Arrays([a, b]));
//=> Uint8Array [1, 2, 3, 4, 5, 6]
```

### `areUint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean`

Check if two arrays are identical by verifying that they contain the same bytes in the same sequence.

Replacement for [`Buffer#equals()`](https://nodejs.org/api/buffer.html#bufequalsotherbuffer).

```js
import {areUint8ArraysEqual} from 'uint8array-extras';

const a = new Uint8Array([1, 2, 3]);
const b = new Uint8Array([1, 2, 3]);
const c = new Uint8Array([4, 5, 6]);

console.log(areUint8ArraysEqual(a, b));
//=> true

console.log(areUint8ArraysEqual(a, c));
//=> false
```

### `compareUint8Arrays(a: Uint8Array, b: Uint8Array): 0 | 1 | -1`

Compare two arrays and indicate their relative order or equality. Useful for sorting.

Replacement for [`Buffer.compare()`](https://nodejs.org/api/buffer.html#static-method-buffercomparebuf1-buf2).

```js
import {compareUint8Arrays} from 'uint8array-extras';

const array1 = new Uint8Array([1, 2, 3]);
const array2 = new Uint8Array([4, 5, 6]);
const array3 = new Uint8Array([7, 8, 9]);

[array3, array1, array2].sort(compareUint8Arrays);
//=> [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
```

### `uint8ArrayToString(array: Uint8Array | ArrayBuffer, encoding?: string = 'utf8'): string`

Convert a `Uint8Array` to a string.

- Parameter: `encoding` - The [encoding](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings) to convert from.

Replacement for [`Buffer#toString()`](https://nodejs.org/api/buffer.html#buftostringencoding-start-end). For the `encoding` parameter, `latin1` should be used instead of `binary` and `utf-16le` instead of `utf16le`.

```js
import {uint8ArrayToString} from 'uint8array-extras';

const byteArray = new Uint8Array([72, 101, 108, 108, 111]);
console.log(uint8ArrayToString(byteArray));
//=> 'Hello'

const zh = new Uint8Array([167, 65, 166, 110]);
console.log(uint8ArrayToString(zh, 'big5'));
//=> '你好'

const ja = new Uint8Array([130, 177, 130, 241, 130, 201, 130, 191, 130, 205]);
console.log(uint8ArrayToString(ja, 'shift-jis'));
//=> 'こんにちは'
```

### `stringToUint8Array(string: string): Uint8Array`

Convert a string to a `Uint8Array` (using UTF-8 encoding).

Replacement for [`Buffer.from('Hello')`](https://nodejs.org/api/buffer.html#static-method-bufferfromstring-encoding).

```js
import {stringToUint8Array} from 'uint8array-extras';

console.log(stringToUint8Array('Hello'));
//=> Uint8Array [72, 101, 108, 108, 111]
```

### `uint8ArrayToBase64(array: Uint8Array, options?: {urlSafe: boolean}): string`

Convert a `Uint8Array` to a Base64-encoded string.

Specify `{urlSafe: true}` to get a [Base64URL](https://base64.guru/standards/base64url)-encoded string.

Replacement for [`Buffer#toString('base64')`](https://nodejs.org/api/buffer.html#buftostringencoding-start-end).

```js
import {uint8ArrayToBase64} from 'uint8array-extras';

const byteArray = new Uint8Array([72, 101, 108, 108, 111]);

console.log(uint8ArrayToBase64(byteArray));
//=> 'SGVsbG8='
```

### `base64ToUint8Array(string: string): Uint8Array`

Convert a Base64-encoded or [Base64URL](https://base64.guru/standards/base64url)-encoded string to a `Uint8Array`.

Accepts Base64URL with or without padding.

Replacement for [`Buffer.from('SGVsbG8=', 'base64')`](https://nodejs.org/api/buffer.html#static-method-bufferfromstring-encoding).

```js
import {base64ToUint8Array} from 'uint8array-extras';

console.log(base64ToUint8Array('SGVsbG8='));
//=> Uint8Array [72, 101, 108, 108, 111]
```

### `stringToBase64(string: string, options?: {urlSafe: boolean}): string`

Encode a string to a Base64-encoded string.

Specify `{urlSafe: true}` to get a [Base64URL](https://base64.guru/standards/base64url)-encoded string.

Replacement for `Buffer.from('Hello').toString('base64')` and [`btoa()`](https://developer.mozilla.org/en-US/docs/Web/API/btoa).

```js
import {stringToBase64} from 'uint8array-extras';

console.log(stringToBase64('Hello'));
//=> 'SGVsbG8='
```

### `base64ToString(base64String: string): string`

Decode a Base64-encoded or [Base64URL](https://base64.guru/standards/base64url)-encoded string to a string.

Accepts Base64URL with or without padding.

Replacement for `Buffer.from('SGVsbG8=', 'base64').toString()` and [`atob()`](https://developer.mozilla.org/en-US/docs/Web/API/atob).

```js
import {base64ToString} from 'uint8array-extras';

console.log(base64ToString('SGVsbG8='));
//=> 'Hello'
```

### `uint8ArrayToHex(array: Uint8Array): string`

Convert a `Uint8Array` to a Hex string.

Replacement for [`Buffer#toString('hex')`](https://nodejs.org/api/buffer.html#buftostringencoding-start-end).

```js
import {uint8ArrayToHex} from 'uint8array-extras';

const byteArray = new Uint8Array([72, 101, 108, 108, 111]);

console.log(uint8ArrayToHex(byteArray));
//=> '48656c6c6f'
```

### `hexToUint8Array(hexString: string): Uint8Array`

Convert a Hex string to a `Uint8Array`.

Replacement for [`Buffer.from('48656c6c6f', 'hex')`](https://nodejs.org/api/buffer.html#static-method-bufferfromstring-encoding).

```js
import {hexToUint8Array} from 'uint8array-extras';

console.log(hexToUint8Array('48656c6c6f'));
//=> Uint8Array [72, 101, 108, 108, 111]
```

### `getUintBE(view: DataView): number`

Read `DataView#byteLength` number of bytes from the given view, up to 48-bit.

Replacement for [`Buffer#readUIntBE`](https://nodejs.org/api/buffer.html#bufreaduintbeoffset-bytelength)

```js
import {getUintBE} from 'uint8array-extras';

const byteArray = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);

console.log(getUintBE(new DataView(byteArray.buffer)));
//=> 20015998341291
```

### `indexOf(array: Uint8Array, value: Uint8Array): number`

Find the index of the first occurrence of the given sequence of bytes (`value`) within the given `Uint8Array` (`array`).

Replacement for [`Buffer#indexOf`](https://nodejs.org/api/buffer.html#bufindexofvalue-byteoffset-encoding). `Uint8Array#indexOf` only takes a number which is different from Buffer's `indexOf` implementation.

```js
import {indexOf} from 'uint8array-extras';

const byteArray = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]);

console.log(indexOf(byteArray, new Uint8Array([0x78, 0x90])));
//=> 3
```

### `includes(array: Uint8Array, value: Uint8Array): boolean`

Checks if the given sequence of bytes (`value`) is within the given `Uint8Array` (`array`).

Returns true if the value is included, otherwise false.

Replacement for [`Buffer#includes`](https://nodejs.org/api/buffer.html#bufincludesvalue-byteoffset-encoding). `Uint8Array#includes` only takes a number which is different from Buffer's `includes` implementation.

```js
import {includes} from 'uint8array-extras';

const byteArray = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]);

console.log(includes(byteArray, new Uint8Array([0x78, 0x90])));
//=> true
```
