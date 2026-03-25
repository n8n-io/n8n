# libbase64

Encode and decode base64 strings.

## Usage

Install with npm

    npm install libbase64

Require in your script

```javascript
const libbase64 = require('libbase64');
```

### Encode values

Encode Buffer objects or unicode strings with

    libbase64.encode(val) → String

Where

-   **val** is a Buffer or an unicode string

**Example**

```javascript
libbase64.encode('jõgeva');
// asO1Z2V2YQ==
```

### Wrap encoded values

To enforce soft line breaks on lines longer than selected amount of characters, use `wrap`

    libbase64.wrap(str[, lineLength]) → String

Where

-   **str** is a base64 encoded string
-   **lineLength** (defaults to 76) is the maximum allowed line length

**Example**

```javascript
libbase64.wrap('asO1Z2V2asO1Z2V2asO1Z2V2YQ==', 10);
// asO1Z2V2as\r\n
// O1Z2V2asO1\r\n
// Z2V2YQ==
```

### Transform Streams

`libbase64` makes it possible to encode and decode streams with `libbase64.Encoder` and `libbase64.Decoder` constructors.

### Encoder Stream

Create new Encoder Stream with

    const encoder = new libbase64.Encoder([options])

Where

-   **options** is the optional stream options object
-   **options.lineLength** (Number) if you want to use any other line length than the default 76
    characters (or set to `false` to turn the soft wrapping off completely)
-   **options.skipStartBytes** (Number) Optional. How many bytes to skip from output (default to 0)
-   **options.limitOutbutBytes** (Number) Optional. How many bytes to return (defaults to all bytes)
-   **options.startPadding** (String) Optional. Fills first line with provided padding string. Usually goes together with skipStartBytes to get line folding correct.

**Example**

The following example script reads in a file, encodes it to base64 and saves the output to a file.

```javascript
const libbase64 = require('libbase64');
const fs = require('fs');
const source = fs.createReadStream('source.txt');
const encoded = fs.createReadStream('encoded.txt');
const encoder = new libbase64.Encoder();

source.pipe(encoder).pipe(encoded);
```

### Decoder Stream

Create new Decoder Stream with

    const decoder = new libbase64.Decoder([options])

Where

-   **options** is the optional stream options object

**Example**

The following example script reads in a file in base64 encoding, decodes it and saves the output to a file.

```javascript
const libbase64 = require('libbase64');
const fs = require('fs');
const encoded = fs.createReadStream('encoded.txt');
const dest = fs.createReadStream('dest.txt');
const decoder = new libbase64.Decoder();

encoded.pipe(decoder).pipe(dest);
```

## License

**MIT**
