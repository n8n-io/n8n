encoding.js
===========

[![NPM Version](https://img.shields.io/npm/v/encoding-japanese.svg)](https://www.npmjs.com/package/encoding-japanese)
[![GitHub Actions Build Status](https://github.com/polygonplanet/encoding.js/actions/workflows/ci.yml/badge.svg)](https://github.com/polygonplanet/encoding.js/actions)
[![GitHub License](https://img.shields.io/github/license/polygonplanet/encoding.js.svg)](https://github.com/polygonplanet/encoding.js/blob/master/LICENSE)

Convert and detect character encoding in JavaScript.

[**README (日本語)**](README_ja.md)

## Table of contents

- [Features](#features)
  * [How to Use Character Encoding in Strings?](#how-to-use-character-encoding-in-strings)
- [Installation](#installation)
  * [npm](#npm)
    + [TypeScript](#typescript)
  * [Browser (standalone)](#browser-standalone)
  * [CDN](#cdn)
- [Supported encodings](#supported-encodings)
  * [About `UNICODE`](#about-unicode)
- [Example usage](#example-usage)
- [Demo](#demo)
- [API](#api)
  * [detect : Detects character encoding](#encodingdetect-data-encodings)
  * [convert : Converts character encoding](#encodingconvert-data-to-from)
    + [Specify conversion options to the argument `to` as an object](#specify-conversion-options-to-the-argument-to-as-an-object)
    + [Specify the return type by the `type` option](#specify-the-return-type-by-the-type-option)
    + [Specify handling for unrepresentable characters](#specify-handling-for-unrepresentable-characters)
    + [Replacing characters with HTML entities when they cannot be represented](#replacing-characters-with-html-entities-when-they-cannot-be-represented)
    + [Ignoring characters when they cannot be represented](#ignoring-characters-when-they-cannot-be-represented)
    + [Throwing an Error when they cannot be represented](#throwing-an-error-when-they-cannot-be-represented)
    + [Specify BOM in UTF-16](#specify-bom-in-utf-16)
  * [urlEncode : Encodes to percent-encoded string](#encodingurlencode-data)
  * [urlDecode : Decodes from percent-encoded string](#encodingurldecode-string)
  * [base64Encode : Encodes to Base64 formatted string](#encodingbase64encode-data)
  * [base64Decode : Decodes from Base64 formatted string](#encodingbase64decode-string)
  * [codeToString : Converts character code array to string](#encodingcodetostring-code)
  * [stringToCode : Converts string to character code array](#encodingstringtocode-string)
  * [Japanese Zenkaku/Hankaku conversion](#japanese-zenkakuhankaku-conversion)
- [Other examples](#other-examples)
  * [Example using the `fetch API` and Typed Arrays (Uint8Array)](#example-using-the-fetch-api-and-typed-arrays-uint8array)
  * [Convert encoding for file using the File APIs](#convert-encoding-for-file-using-the-file-apis)
- [Contributing](#contributing)
- [License](#license)

## Features

encoding.js is a JavaScript library for converting and detecting character encodings,
supporting both Japanese character encodings (`Shift_JIS`, `EUC-JP`, `ISO-2022-JP`) and Unicode formats (`UTF-8`, `UTF-16`).

Since JavaScript string values are internally encoded as UTF-16 code units
([ref: ECMAScript® 2019 Language Specification - 6.1.4 The String Type](https://www.ecma-international.org/ecma-262/10.0/index.html#sec-ecmascript-language-types-string-type)),
they cannot directly handle other character encodings as strings. However, encoding.js overcomes this limitation by treating these encodings as arrays instead of strings,
enabling the conversion between different character sets.

Each character encoding is represented as an array of numbers corresponding to character code values, for example, `[130, 160]` represents "あ" in UTF-8.

The array of character codes used in its methods can also be utilized with TypedArray objects, such as `Uint8Array`, or with `Buffer` in Node.js.

### How to Use Character Encoding in Strings?

Numeric arrays of character codes can be converted to strings using methods such as [`Encoding.codeToString`](#encodingcodetostring-code).
However, due to the JavaScript specifications mentioned above, some character encodings may not be handled properly when converted directly to strings.

If you prefer to use strings instead of numeric arrays, you can convert them to percent-encoded strings,
such as `'%82%A0'`, using [`Encoding.urlEncode`](#encodingurlencode-data) and [`Encoding.urlDecode`](#encodingurldecode-string) for passing to other resources.
Similarly, [`Encoding.base64Encode`](#encodingbase64encode-data) and [`Encoding.base64Decode`](#encodingbase64decode-string) allow for encoding and decoding to and from base64,
which can then be passed as strings.

## Installation

### npm

encoding.js is published under the package name `encoding-japanese` on npm.

```bash
npm install --save encoding-japanese
```

#### Using ES6 `import`

```javascript
import Encoding from 'encoding-japanese';
```

#### Using CommonJS `require`

```javascript
const Encoding = require('encoding-japanese');
```

#### TypeScript

TypeScript type definitions for encoding.js are available at [@types/encoding-japanese](https://www.npmjs.com/package/@types/encoding-japanese) (thanks to [@rhysd](https://github.com/rhysd)).

```bash
npm install --save-dev @types/encoding-japanese
```

### Browser (standalone)

To use encoding.js in a browser environment, you can either install it via npm or download it directly from the [release list](https://github.com/polygonplanet/encoding.js/tags).
The package includes both `encoding.js` and `encoding.min.js`.

Note: Cloning the repository via `git clone` might give you access to the *master* (or *main*) branch, which could still be in a development state.

```html
<!-- To include the full version -->
<script src="encoding.js"></script>

<!-- Or, to include the minified version for production -->
<script src="encoding.min.js"></script>
```

When the script is loaded, the object `Encoding` is defined in the global scope (i.e., `window.Encoding`).

### CDN

You can use encoding.js (package name: `encoding-japanese`) directly from a CDN via a script tag:

```html
<script src="https://unpkg.com/encoding-japanese@2.2.0/encoding.min.js"></script>
```

In this example we use [unpkg](https://unpkg.com/encoding-japanese/), but you can use any CDN that provides npm packages,
for example [cdnjs](https://cdnjs.com/libraries/encoding-japanese) or [jsDelivr](https://www.jsdelivr.com/package/npm/encoding-japanese).

## Supported encodings

|Value in encoding.js|[`detect()`](#encodingdetect-data-encodings)|[`convert()`](#encodingconvert-data-to-from)|MIME Name (Note)|
|:------:|:----:|:-----:|:---|
|ASCII   |✓    |       |US-ASCII (Code point range: `0-127`)|
|BINARY  |✓    |       |(Binary string. Code point range: `0-255`)|
|EUCJP   |✓    |✓     |EUC-JP|
|JIS     |✓    |✓     |ISO-2022-JP|
|SJIS    |✓    |✓     |Shift_JIS|
|UTF8    |✓    |✓     |UTF-8|
|UTF16   |✓    |✓     |UTF-16|
|UTF16BE |✓    |✓     |UTF-16BE (big-endian)|
|UTF16LE |✓    |✓     |UTF-16LE (little-endian)|
|UTF32   |✓    |       |UTF-32|
|UNICODE |✓    |✓     |(JavaScript string. *See [About `UNICODE`](#about-unicode) below) |

### About `UNICODE`

In encoding.js, `UNICODE` is defined as the internal character encoding that JavaScript strings (JavaScript string objects) can handle directly.

As mentioned in the [Features](#features) section, JavaScript strings are internally encoded using UTF-16 code units.
This means that other character encodings cannot be directly handled without conversion.
Therefore, when converting to a character encoding that is properly representable in JavaScript, you should specify `UNICODE`.

(Note: Even if the HTML file's encoding is UTF-8, you should specify `UNICODE` instead of `UTF8` when processing the encoding in JavaScript.)

When using [`Encoding.convert`](#encodingconvert-data-to-from), if you specify a character encoding other than `UNICODE` (such as `UTF8` or `SJIS`), the values in the returned character code array will range from `0-255`.
However, if you specify `UNICODE`, the values will range from `0-65535`, which corresponds to the range of values returned by `String.prototype.charCodeAt()` (Code Units).

## Example usage

Convert character encoding from JavaScript string (`UNICODE`) to `SJIS`.

```javascript
const unicodeArray = Encoding.stringToCode('こんにちは'); // Convert string to code array
const sjisArray = Encoding.convert(unicodeArray, {
  to: 'SJIS',
  from: 'UNICODE'
});
console.log(sjisArray);
// [130, 177, 130, 241, 130, 201, 130, 191, 130, 205] ('こんにちは' array in SJIS)
```

Convert character encoding from `SJIS` to `UNICODE`.

```javascript
const sjisArray = [
  130, 177, 130, 241, 130, 201, 130, 191, 130, 205
]; // 'こんにちは' array in SJIS

const unicodeArray = Encoding.convert(sjisArray, {
  to: 'UNICODE',
  from: 'SJIS'
});
const str = Encoding.codeToString(unicodeArray); // Convert code array to string
console.log(str); // 'こんにちは'
```

Detect character encoding.

```javascript
const data = [
  227, 129, 147, 227, 130, 147, 227, 129, 171, 227, 129, 161, 227, 129, 175
]; // 'こんにちは' array in UTF-8

const detectedEncoding = Encoding.detect(data);
console.log(`Character encoding is ${detectedEncoding}`); // 'Character encoding is UTF8'
```

(Node.js) Example of reading a text file written in `SJIS`.

```javascript
const fs = require('fs');
const Encoding = require('encoding-japanese');

const sjisBuffer = fs.readFileSync('./sjis.txt');
const unicodeArray = Encoding.convert(sjisBuffer, {
  to: 'UNICODE',
  from: 'SJIS'
});
console.log(Encoding.codeToString(unicodeArray));
```

## Demo

* [Test for character encoding conversion (Demo)](https://polygonplanet.github.io/encoding.js/tests/encoding-test.html)
* [Detect and Convert encoding from file (Demo)](https://polygonplanet.github.io/encoding.js/tests/detect-file-encoding.html)

----

## API

* [detect](#encodingdetect-data-encodings)
* [convert](#encodingconvert-data-to-from)
* [urlEncode](#encodingurlencode-data)
* [urlDecode](#encodingurldecode-string)
* [base64Encode](#encodingbase64encode-data)
* [base64Decode](#encodingbase64decode-string)
* [codeToString](#encodingcodetostring-code)
* [stringToCode](#encodingstringtocode-string)
* [Japanese Zenkaku/Hankaku conversion](#japanese-zenkakuhankaku-conversion)

----

### Encoding.detect (data, [encodings])

Detects the character encoding of the given data.

#### Parameters

* **data** *(Array\<number\>|TypedArray|Buffer|string)* : The code array or string to detect character encoding.
* **\[encodings\]** *(string|Array\<string\>|Object)* : (Optional) Specifies a specific character encoding,
  or an array of encodings to limit the detection. Detects automatically if this argument is omitted or `AUTO` is specified.
  Supported encoding values can be found in the "[Supported encodings](#supported-encodings)" section.

#### Return value

*(string|boolean)*: Returns a string representing the detected encoding (e.g., `SJIS`, `UTF8`) listed in the "[Supported encodings](#supported-encodings)" section, or `false` if the encoding cannot be detected.
If the `encodings` argument is provided, it returns the name of the detected encoding if the `data` matches any of the specified encodings, or `false` otherwise.

#### Examples

Example of detecting character encoding.

```javascript
const sjisArray = [130, 168, 130, 205, 130, 230]; // 'おはよ' array in SJIS
const detectedEncoding = Encoding.detect(sjisArray);
console.log(`Encoding is ${detectedEncoding}`); // 'Encoding is SJIS'
```

Example of using the `encodings` argument to specify the character encoding to be detected.
This returns a string detected encoding if the specified encoding matches, or `false` otherwise:

```javascript
const sjisArray = [130, 168, 130, 205, 130, 230]; // 'おはよ' array in SJIS
const detectedEncoding = Encoding.detect(sjisArray, 'SJIS');
if (detectedEncoding) {
  console.log('Encoding is SJIS');
} else {
  console.log('Encoding does not match SJIS');
}
```

Example of specifying multiple encodings:

```javascript
const sjisArray = [130, 168, 130, 205, 130, 230]; // 'おはよ' array in SJIS
const detectedEncoding = Encoding.detect(sjisArray, ['UTF8', 'SJIS']);
if (detectedEncoding) {
  console.log(`Encoding is ${detectedEncoding}`); // 'Encoding is SJIS'
} else {
  console.log('Encoding does not match UTF8 and SJIS');
}
```

----

### Encoding.convert (data, to[, from])

Converts the character encoding of the given data.

#### Parameters

* **data** *(Array\<number\>|TypedArray|Buffer|string)* : The code array or string to convert character encoding.
* **to** *(string|Object)* : The character encoding name of the conversion destination as a string, or conversion options as an object.
* **\[from\]** *(string|Array\<string\>)* : (Optional) The character encoding name of the conversion source as a string,
  or an array of encoding names. Detects automatically if this argument is omitted or `AUTO` is specified.
  Supported encoding values can be found in the "[Supported encodings](#supported-encodings)" section.

#### Return value

*(Array\<number\>|TypedArray|string)* : Returns a numeric character code array of the converted character encoding if `data` is an array or a buffer,
 or returns the converted string if `data` is a string.

#### Examples

Example of converting a character code array to Shift_JIS from UTF-8:

```javascript
const utf8Array = [227, 129, 130]; // 'あ' in UTF-8
const sjisArray = Encoding.convert(utf8Array, 'SJIS', 'UTF8');
console.log(sjisArray); // [130, 160] ('あ' in SJIS)
```

TypedArray such as `Uint8Array`, and `Buffer` of Node.js can be converted in the same usage:

```javascript
const utf8Array = new Uint8Array([227, 129, 130]);
const sjisArray = Encoding.convert(utf8Array, 'SJIS', 'UTF8');
```

Converts character encoding by auto-detecting the encoding name of the source:

```javascript
// The character encoding is automatically detected when the argument `from` is omitted
const utf8Array = [227, 129, 130];
let sjisArray = Encoding.convert(utf8Array, 'SJIS');
// Or explicitly specify 'AUTO' to auto-detecting
sjisArray = Encoding.convert(utf8Array, 'SJIS', 'AUTO');
```

#### Specify conversion options to the argument `to` as an object

You can pass the second argument `to` as an object for improving readability.
Also, the following options such as `type`, `fallback`, and `bom` must be specified with an object.

```javascript
const utf8Array = [227, 129, 130];
const sjisArray = Encoding.convert(utf8Array, {
  to: 'SJIS',
  from: 'UTF8'
});
```

#### Specify the return type by the `type` option

`convert` returns an array by default, but you can change the return type by specifying the `type` option.
Also, if the argument `data` is passed as a string and the` type` option is not specified, then `type` ='string' is assumed (returns as a string).

```javascript
const sjisArray = [130, 168, 130, 205, 130, 230]; // 'おはよ' array in SJIS
const unicodeString = Encoding.convert(sjisArray, {
  to: 'UNICODE',
  from: 'SJIS',
  type: 'string' // Specify 'string' to return as string
});
console.log(unicodeString); // 'おはよ'
```

The following `type` options are supported.

* **string** : Return as a string.
* **arraybuffer** : Return as an ArrayBuffer (Actually returns a `Uint16Array` due to historical reasons).
* **array** :  Return as an Array. (*default*)

`type: 'string'` can be used as a shorthand for converting a code array to a string,
as performed by [`Encoding.codeToString`](#encodingcodetostring-code).  
Note: Specifying `type: 'string'` may not handle conversions properly, except when converting to `UNICODE`.

#### Specify handling for unrepresentable characters

With the `fallback` option, you can specify how to handle characters that cannot be represented in the target encoding.
The `fallback` option supports the following values:

* **html-entity**: Replace characters with HTML entities (decimal HTML numeric character references).
* **html-entity-hex**: Replace characters with HTML entities (hexadecimal HTML numeric character references).
* **ignore**: Ignore characters that cannot be represented.
* **error**: Throw an error if any character cannot be represented.

#### Replacing characters with HTML entities when they cannot be represented

Characters that cannot be represented in the target character set are replaced with '?' (U+003F) by default,
but by specifying `html-entity` as the `fallback` option, you can replace them with HTML entities (Numeric character references), such as `&#127843;`.

Example of specifying `{ fallback: 'html-entity' }` option:

```javascript
const unicodeArray = Encoding.stringToCode('寿司🍣ビール🍺');
// No fallback specified
let sjisArray = Encoding.convert(unicodeArray, {
  to: 'SJIS',
  from: 'UNICODE'
});
console.log(sjisArray); // Converted to a code array of '寿司?ビール?'

// Specify `fallback: html-entity`
sjisArray = Encoding.convert(unicodeArray, {
  to: 'SJIS',
  from: 'UNICODE',
  fallback: 'html-entity'
});
console.log(sjisArray); // Converted to a code array of '寿司&#127843;ビール&#127866;'
```

Example of specifying `{ fallback: 'html-entity-hex' }` option:

```javascript
const unicodeArray = Encoding.stringToCode('ホッケの漢字は𩸽');
const sjisArray = Encoding.convert(unicodeArray, {
  to: 'SJIS',
  from: 'UNICODE',
  fallback: 'html-entity-hex'
});
console.log(sjisArray); // Converted to a code array of 'ホッケの漢字は&#x29e3d;'
```

#### Ignoring characters when they cannot be represented

By specifying `ignore` as a `fallback` option, characters that cannot be represented in the target encoding format can be ignored.

Example of specifying `{ fallback: 'ignore' }` option:

```javascript
const unicodeArray = Encoding.stringToCode('寿司🍣ビール🍺');
// No fallback specified
let sjisArray = Encoding.convert(unicodeArray, {
  to: 'SJIS',
  from: 'UNICODE'
});
console.log(sjisArray); // Converted to a code array of '寿司?ビール?'

// Specify `fallback: ignore`
sjisArray = Encoding.convert(unicodeArray, {
  to: 'SJIS',
  from: 'UNICODE',
  fallback: 'ignore'
});
console.log(sjisArray); // Converted to a code array of '寿司ビール'
```

#### Throwing an Error when they cannot be represented

If you need to throw an error when a character cannot be represented in the target character encoding,
specify `error` as a `fallback` option. This will cause an exception to be thrown.

Example of specifying `{ fallback: 'error' }` option:

```javascript
const unicodeArray = Encoding.stringToCode('おにぎり🍙ラーメン🍜');
try {
  const sjisArray = Encoding.convert(unicodeArray, {
    to: 'SJIS',
    from: 'UNICODE',
    fallback: 'error' // Specify 'error' to throw an exception
  });
} catch (e) {
  console.error(e); // Error: Character cannot be represented: [240, 159, 141, 153]
}
```

#### Specify BOM in UTF-16

You can add a BOM (byte order mark) by specifying the `bom` option when converting to `UTF16`.
The default is no BOM.

```javascript
const utf16Array = Encoding.convert(utf8Array, {
  to: 'UTF16',
  from: 'UTF8',
  bom: true // Specify to add the BOM
});
```

`UTF16` byte order is big-endian by default.
If you want to convert as little-endian, specify the `{ bom: 'LE' }` option.

```javascript
const utf16leArray = Encoding.convert(utf8Array, {
  to: 'UTF16',
  from: 'UTF8',
  bom: 'LE' // Specify to add the BOM as little-endian
});
```

If you do not need BOM, use `UTF16BE` or `UTF16LE`.
`UTF16BE` is big-endian, and `UTF16LE` is little-endian, and both have no BOM.

```javascript
const utf16beArray = Encoding.convert(utf8Array, {
  to: 'UTF16BE',
  from: 'UTF8'
});
```

----

### Encoding.urlEncode (data)

Encodes a numeric character code array into a percent-encoded string formatted as a URI component in `%xx` format.

urlEncode escapes all characters except the following, just like [`encodeURIComponent()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent).

```
A-Z a-z 0-9 - _ . ! ~ * ' ( )
```

#### Parameters

* **data** *(Array\<number\>|TypedArray|Buffer|string)* : The numeric character code array or string that will be encoded into a percent-encoded URI component.

#### Return value

*(string)* : Returns a percent-encoded string formatted as a URI component in `%xx` format.

#### Examples

Example of URL encoding a Shift_JIS array:

```javascript
const sjisArray = [130, 168, 130, 205, 130, 230]; // 'おはよ' array in SJIS
const encoded = Encoding.urlEncode(sjisArray);
console.log(encoded); // '%82%A8%82%CD%82%E6'
```

----

### Encoding.urlDecode (string)

Decodes a percent-encoded string formatted as a URI component in `%xx` format to a numeric character code array.

#### Parameters

* **string** *(string)* : The string to decode.

#### Return value

*(Array\<number\>)* : Returns a numeric character code array.

#### Examples

Example of decoding a percent-encoded Shift_JIS string:

```javascript
const encoded = '%82%A8%82%CD%82%E6'; // 'おはよ' encoded as percent-encoded SJIS string
const sjisArray = Encoding.urlDecode(encoded);
console.log(sjisArray); // [130, 168, 130, 205, 130, 230]
```

----

### Encoding.base64Encode (data)

Encodes a numeric character code array into a Base64 encoded string.

#### Parameters

* **data** *(Array\<number\>|TypedArray|Buffer|string)* : The numeric character code array or string to encode.

#### Return value

*(string)* : Returns a Base64 encoded string.

#### Examples

Example of Base64 encoding a Shift_JIS array:

```javascript
const sjisArray = [130, 168, 130, 205, 130, 230]; // 'おはよ' array in SJIS
const encodedStr = Encoding.base64Encode(sjisArray);
console.log(encodedStr); // 'gqiCzYLm'
```

----

### Encoding.base64Decode (string)

Decodes a Base64 encoded string to a numeric character code array.

#### Parameters

* **string** *(string)* : The Base64 encoded string to decode.

#### Return value

*(Array\<number\>)* : Returns a Base64 decoded numeric character code array.

#### Examples

Example of `base64Encode` and `base64Decode`:

```javascript
const sjisArray = [130, 177, 130, 241, 130, 201, 130, 191, 130, 205]; // 'こんにちは' array in SJIS
const encodedStr = Encoding.base64Encode(sjisArray);
console.log(encodedStr); // 'grGC8YLJgr+CzQ=='

const decodedArray = Encoding.base64Decode(encodedStr);
console.log(decodedArray); // [130, 177, 130, 241, 130, 201, 130, 191, 130, 205]
```

----

### Encoding.codeToString (code)

Converts a numeric character code array to string.

#### Parameters

* **code** *(Array\<number\>|TypedArray|Buffer)* : The numeric character code array to convert.

#### Return value

*(string)* : Returns a converted string.

#### Examples

Example of converting a character code array to a string:

```javascript
const sjisArray = [130, 168, 130, 205, 130, 230]; // 'おはよ' array in SJIS
const unicodeArray = Encoding.convert(sjisArray, {
  to: 'UNICODE',
  from: 'SJIS'
});
const unicodeStr = Encoding.codeToString(unicodeArray);
console.log(unicodeStr); // 'おはよ'
```

----

### Encoding.stringToCode (string)

Converts a string to a numeric character code array.

#### Parameters

* **string** *(string)* : The string to convert.

#### Return value

*(Array\<number\>)* : Returns a numeric character code array converted from the string.

#### Examples

Example of converting a string to a character code array:

```javascript
const unicodeArray = Encoding.stringToCode('おはよ');
console.log(unicodeArray); // [12362, 12399, 12424]
```

----

### Japanese Zenkaku/Hankaku conversion

The following methods convert Japanese full-width (zenkaku) and half-width (hankaku) characters,
suitable for use with `UNICODE` strings or numeric character code arrays of `UNICODE`.

Returns a converted string if the argument `data` is a string.
Returns a numeric character code array if the argument `data` is a code array.

- **Encoding.toHankakuCase (data)** : Converts full-width (zenkaku) symbols and alphanumeric characters to their half-width (hankaku) equivalents.
- **Encoding.toZenkakuCase (data)** : Converts half-width (hankaku) symbols and alphanumeric characters to their full-width (zenkaku) equivalents.
- **Encoding.toHiraganaCase (data)** : Converts full-width katakana to full-width hiragana.
- **Encoding.toKatakanaCase (data)** : Converts full-width hiragana to full-width katakana.
- **Encoding.toHankanaCase (data)** : Converts full-width katakana to half-width katakana.
- **Encoding.toZenkanaCase (data)** : Converts half-width katakana to full-width katakana.
- **Encoding.toHankakuSpace (data)** : Converts the em space (U+3000) to the single space (U+0020).
- **Encoding.toZenkakuSpace (data)** : Converts the single space (U+0020) to the em space (U+3000).

#### Parameters

- **data** *(Array\<number\>|TypedArray|Buffer|string)* : The string or numeric character code array to convert.

#### Return value

*(Array\<number\>|string)* : Returns a converted string or numeric character code array.

#### Examples

Example of converting zenkaku and hankaku strings:

```javascript
console.log(Encoding.toHankakuCase('ａｂｃＤＥＦ１２３＠！＃＊＝')); // 'abcDEF123@!#*='
console.log(Encoding.toZenkakuCase('abcDEF123@!#*=')); // 'ａｂｃＤＥＦ１２３＠！＃＊＝'
console.log(Encoding.toHiraganaCase('アイウエオァィゥェォヴボポ')); // 'あいうえおぁぃぅぇぉゔぼぽ'
console.log(Encoding.toKatakanaCase('あいうえおぁぃぅぇぉゔぼぽ')); // 'アイウエオァィゥェォヴボポ'
console.log(Encoding.toHankanaCase('アイウエオァィゥェォヴボポ')); // 'ｱｲｳｴｵｧｨｩｪｫｳﾞﾎﾞﾎﾟ'
console.log(Encoding.toZenkanaCase('ｱｲｳｴｵｧｨｩｪｫｳﾞﾎﾞﾎﾟ')); // 'アイウエオァィゥェォヴボポ'
console.log(Encoding.toHankakuSpace('あいうえお　abc　123')); // 'あいうえお abc 123'
console.log(Encoding.toZenkakuSpace('あいうえお abc 123')); // 'あいうえお　abc　123'
```

Example of converting zenkaku and hankaku code arrays:

```javascript
const unicodeArray = Encoding.stringToCode('ａｂｃ１２３！＃　あいうアイウ ABCｱｲｳ');
console.log(Encoding.codeToString(Encoding.toHankakuCase(unicodeArray)));
// 'abc123!#　あいうアイウ ABCｱｲｳ'
console.log(Encoding.codeToString(Encoding.toZenkakuCase(unicodeArray)));
// 'ａｂｃ１２３！＃　あいうアイウ ＡＢＣｱｲｳ'
console.log(Encoding.codeToString(Encoding.toHiraganaCase(unicodeArray)));
// 'ａｂｃ１２３！＃　あいうあいう ABCｱｲｳ'
console.log(Encoding.codeToString(Encoding.toKatakanaCase(unicodeArray)));
// 'ａｂｃ１２３！＃　アイウアイウ ABCｱｲｳ'
console.log(Encoding.codeToString(Encoding.toHankanaCase(unicodeArray)));
// 'ａｂｃ１２３！＃　あいうｱｲｳ ABCｱｲｳ'
console.log(Encoding.codeToString(Encoding.toZenkanaCase(unicodeArray)));
// 'ａｂｃ１２３！＃　あいうアイウ ABCアイウ'
console.log(Encoding.codeToString(Encoding.toHankakuSpace(unicodeArray)));
// 'ａｂｃ１２３！＃ あいうアイウ ABCｱｲｳ'
console.log(Encoding.codeToString(Encoding.toZenkakuSpace(unicodeArray)));
// 'ａｂｃ１２３！＃　あいうアイウ　ABCｱｲｳ'
```

----

## Other examples

### Example using the `Fetch API` and Typed Arrays (Uint8Array)

This example reads a text file encoded in Shift_JIS as binary data,
and displays it as a string after converting it to Unicode using [Encoding.convert](#encodingconvert-data-to-from).

```javascript
(async () => {
  try {
    const response = await fetch('shift_jis.txt');
    const buffer = await response.arrayBuffer();

    // Code array with Shift_JIS file contents
    const sjisArray = new Uint8Array(buffer);

    // Convert encoding to UNICODE (JavaScript Code Units) from Shift_JIS
    const unicodeArray = Encoding.convert(sjisArray, {
      to: 'UNICODE',
      from: 'SJIS'
    });

    // Convert to string from code array for display
    const unicodeString = Encoding.codeToString(unicodeArray);
    console.log(unicodeString);
  } catch (error) {
    console.error('Error loading the file:', error);
  }
})();
```

<details>
<summary>XMLHttpRequest version of this example</summary>

```javascript
const req = new XMLHttpRequest();
req.open('GET', 'shift_jis.txt', true);
req.responseType = 'arraybuffer';

req.onload = (event) => {
  const buffer = req.response;
  if (buffer) {
    // Code array with Shift_JIS file contents
    const sjisArray = new Uint8Array(buffer);

    // Convert encoding to UNICODE (JavaScript Code Units) from Shift_JIS
    const unicodeArray = Encoding.convert(sjisArray, {
      to: 'UNICODE',
      from: 'SJIS'
    });

    // Convert to string from code array for display
    const unicodeString = Encoding.codeToString(unicodeArray);
    console.log(unicodeString);
  }
};

req.send(null);
```
</details>

### Convert encoding for file using the File APIs

This example uses the File API to read the content of a selected file, detects its character encoding,
and converts the file content to UNICODE from any character encoding such as `Shift_JIS` or `EUC-JP`.
The converted content is then displayed in a textarea.

```html
<input type="file" id="file">
<div id="encoding"></div>
<textarea id="content" rows="5" cols="80"></textarea>

<script>
function onFileSelect(event) {
  const file = event.target.files[0];

  const reader = new FileReader();
  reader.onload = function(e) {
    const codes = new Uint8Array(e.target.result);

    const detectedEncoding = Encoding.detect(codes);
    const encoding = document.getElementById('encoding');
    encoding.textContent = `Detected encoding: ${detectedEncoding}`;

    // Convert encoding to UNICODE
    const unicodeString = Encoding.convert(codes, {
      to: 'UNICODE',
      from: detectedEncoding,
      type: 'string'
    });
    document.getElementById('content').value = unicodeString;
  };

  reader.readAsArrayBuffer(file);
}

document.getElementById('file').addEventListener('change', onFileSelect);
</script>
```

[**Demo**](https://polygonplanet.github.io/encoding.js/tests/detect-file-encoding.html)

## Contributing

We welcome contributions from everyone.
For bug reports and feature requests, please [create an issue on GitHub](https://github.com/polygonplanet/encoding.js/issues).

### Pull requests

Before submitting a pull request, please run `npm run test` to ensure there are no errors.
We only accept pull requests that pass all tests.

## License

This project is licensed under the terms of the MIT license.
See the [LICENSE](LICENSE) file for details.
