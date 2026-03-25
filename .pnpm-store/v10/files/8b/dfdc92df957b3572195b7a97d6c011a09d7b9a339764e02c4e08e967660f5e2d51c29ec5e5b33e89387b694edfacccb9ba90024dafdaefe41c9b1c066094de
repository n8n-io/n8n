# libqp

Encode and decode quoted-printable strings according to [RFC2045](http://tools.ietf.org/html/rfc2045#section-6.7).

## Usage

Install with npm

```
npm install libqp
```

Require in your script

```javascript
const libqp = require('libqp');
```

### Encode values

Encode Buffer objects or unicode strings with

```
libqp.encode(val) → String
```

Where

-   **val** is a Buffer or an unicode string

**Example**

```javascript
libqp.encode('jõgeva');
// j=C3=B5geva
```

### Wrap encoded values

Quoted-Printable encoded lines are limited to 76 characters but `encode` method might return lines longer than the limit.

To enforce soft line breaks on lines longer than 76 (or any other length) characters, use `wrap`

```
libqp.wrap(str[, lineLength]) → String
```

Where

-   **str** is a Quoted-Printable encoded string
-   **lineLength** (defaults to 76) is the maximum allowed line length. Any longer line will be soft wrapped

**Example**

```javascript
libqp.wrap('abc j=C3=B5geva', 10);
// abc j=\r\n
// =C3=B5geva
```

### Transform Streams

`libqp` makes it possible to encode and decode streams with `libqp.Encoder` and `libqp.Decoder` constructors.

### Encoder Stream

Create new Encoder Stream with

```
const encoder = new libqp.Encoder([options])
```

Where

-   **options** is the optional stream options object with an additional option `lineLength` if you want to use any other line length than the default 76 characters (or set to `false` to turn the soft wrapping off completely)

**Example**

The following example script reads in a file, encodes it to Quoted-Printable and saves the output to a file.

```javascript
var libqp = require('libqp');
var fs = require('fs');
var source = fs.createReadStream('source.txt');
var encoded = fs.createReadStream('encoded.txt');
var encoder = new libqp.Encoder();

source.pipe(encoder).pipe(encoded);
```

### Decoder Stream

Create new Decoder Stream with

```
const decoder = new libqp.Decoder([options])
```

Where

-   **options** is the optional stream options object

**Example**

The following example script reads in a file in Quoted-Printable encoding, decodes it and saves the output to a file.

```javascript
const libqp = require('libqp');
const fs = require('fs');
let encoded = fs.createReadStream('encoded.txt');
let dest = fs.createReadStream('dest.txt');
let decoder = new libqp.Decoder();

encoded.pipe(decoder).pipe(dest);
```

## License

**MIT**
