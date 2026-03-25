# chardet

_Chardet_ is a character detection module written in pure JavaScript (TypeScript). Module uses occurrence analysis to determine the most probable encoding.

- Packed size is only **22 KB**
- Works in all environments: Node / Browser / Native
- Works on all platforms: Linux / Mac / Windows
- No dependencies
- No native code / bindings
- 100% written in TypeScript
- Extensive code coverage

## Installation

```
npm i chardet
```

## Usage

To return the encoding with the highest confidence:

```javascript
import chardet from 'chardet';

const encoding = chardet.detect(Buffer.from('hello there!'));
// or
const encoding = await chardet.detectFile('/path/to/file');
// or
const encoding = chardet.detectFileSync('/path/to/file');
```

To return the full list of possible encodings use `analyse` method.

```javascript
import chardet from 'chardet';
chardet.analyse(Buffer.from('hello there!'));
```

Returned value is an array of objects sorted by confidence value in descending order

```javascript
[
  { confidence: 90, name: 'UTF-8' },
  { confidence: 20, name: 'windows-1252', lang: 'fr' },
];
```

In browser, you can use [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) instead of the `Buffer`:

```javascript
import chardet from 'chardet';
chardet.analyse(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]));
```

## Working with large data sets

Sometimes, when data set is huge and you want to optimize performance (with a tradeoff of less accuracy),
you can sample only the first N bytes of the buffer:

```javascript
chardet
  .detectFile('/path/to/file', { sampleSize: 32 })
  .then((encoding) => console.log(encoding));
```

You can also specify where to begin reading from in the buffer:

```javascript
chardet
  .detectFile('/path/to/file', { sampleSize: 32, offset: 128 })
  .then((encoding) => console.log(encoding));
```

## Supported Encodings:

- UTF-8
- UTF-16 LE
- UTF-16 BE
- UTF-32 LE
- UTF-32 BE
- ISO-2022-JP
- ISO-2022-KR
- ISO-2022-CN
- Shift_JIS
- Big5
- EUC-JP
- EUC-KR
- GB18030
- ISO-8859-1
- ISO-8859-2
- ISO-8859-5
- ISO-8859-6
- ISO-8859-7
- ISO-8859-8
- ISO-8859-9
- windows-1250
- windows-1251
- windows-1252
- windows-1253
- windows-1254
- windows-1255
- windows-1256
- KOI8-R

Currently only these encodings are supported.

## TypeScript?

Yes. Type definitions are included.

### References

- ICU project http://site.icu-project.org/
