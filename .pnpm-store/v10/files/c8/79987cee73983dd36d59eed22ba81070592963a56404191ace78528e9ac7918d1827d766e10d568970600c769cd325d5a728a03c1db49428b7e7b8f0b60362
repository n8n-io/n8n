# dingbat-to-unicode

Mapping from Dingbat fonts, such as Symbol, Webdings and Wingdings, to Unicode code points.

The following fonts are supported:

* Symbol
* Webdings
* Wingdings 1
* Wingdings 2
* Wingdings 3

Note that in some cases, such as docx files,
the dingbat code point may have 0xF000 added to it to shift the code point into the Unicode private use area.
You should subtract 0xF000 from the code point before passing it into this library.

## Installation

    npm install dingbat-to-unicode

## Usage

Import using `require` or `import`:

```javascript
const dingbatToUnicode = require("dingbat-to-unicode");
// or
import * as dingbatToUnicode from "dingbat-to-unicode";
```

You can then call one of the following functions, depending on the representation you have the dingbat code point in:

* `dingbatToUnicode.codePoint(typeface: string, codePoint: number): UnicodeScalarValue | undefined`

* `dingbatToUnicode.dec(typeface: string, dec: string): UnicodeScalarValue | undefined`

* `dingbatToUnicode.hex(typeface: string, hex: string): UnicodeScalarValue | undefined`

`UnicodeScalarValue` is an object with two properties:

* `codePoint`: a `number` representing the Unicode code point
* `string`: a `string` representing the code point as a string

## Examples

```javascript
const result = dingbatToUnicode.codePoint("Wingdings", 41)!!;
assert.strictEqual(result.codePoint, 0x2706);
```

```javascript
const result = dingbatToUnicode.dec("Wingdings", "41")!!;
assert.strictEqual(result.codePoint, 0x2706);
```

```javascript
const result = dingbatToUnicode.hex("Wingdings", "29")!!;
assert.strictEqual(result.codePoint, 0x2706);
```

```javascript
const result = dingbatToUnicode.hex("Wingdings", "3E")!!;
assert.strictEqual(result.codePoint, 0x2707);
```

```javascript
const result = dingbatToUnicode.hex("Wingdings", "3e")!!;
assert.strictEqual(result.codePoint, 0x2707);
```

```javascript
const result = dingbatToUnicode.hex("Wingdings", "29")!!;
assert.strictEqual(result.string, "\u2706");
```

```javascript
const result = dingbatToUnicode.hex("Wingdings", "28")!!;
assert.strictEqual(result.string, "🕿");
```
