# libmime

`libmime` provides useful MIME related functions. For Quoted-Printable and Base64 encoding and decoding see [libqp](https://github.com/andris9/libqp) and [libbase64](https://github.com/andris9/libabase64).

## Installation

### [npm](https://www.npmjs.org/):

    npm install libmime

## Usage

    var libmime = require('libmime');

## Methods

### Encoded Words

#### #encodeWord

Encodes a string into mime [encoded word](http://en.wikipedia.org/wiki/MIME#Encoded-Word) format.

    libmime.encodeWord(str [, mimeWordEncoding[, maxLength]]) → String

*   **str** - String or Buffer to be encoded
*   **mimeWordEncoding** - Encoding for the mime word, either Q or B (default is 'Q')
*   **maxLength** - If set, split mime words into several chunks if needed

**Example**

    libmime.encodeWord('See on õhin test', 'Q');

Becomes with UTF-8 and Quoted-printable encoding

    =?UTF-8?Q?See_on_=C3=B5hin_test?=

#### #encodeWords

Encodes non ascii sequences in a string to mime words.

    libmime.encodeWords(str[, mimeWordEncoding[, maxLength]) → String

*   **str** - String or Buffer to be encoded
*   **mimeWordEncoding** - Encoding for the mime word, either Q or B (default is 'Q')
*   **maxLength** - If set, split mime words into several chunks if needed

#### #decodeWords

Decodes a string that might include one or several mime words. If no mime words are found from the string, the original string is returned

    libmime.decodeWords(str) → String

*   **str** - String to be decoded

### Folding

#### #foldLines

Folds a long line according to the [RFC 5322](http://tools.ietf.org/html/rfc5322#section-2.1.1). Mostly needed for folding header lines.

    libmime.foldLines(str [, lineLength[, afterSpace]]) → String

*   **str** - String to be folded
*   **lineLength** - Maximum length of a line (defaults to 76)
*   **afterSpace** - If true, leave a space in the end of a line

**Example**

    libmime.foldLines('Content-Type: multipart/alternative; boundary="----zzzz----"')

results in

    Content-Type: multipart/alternative;
         boundary="----zzzz----"

#### #encodeFlowed

Adds soft line breaks to content marked with `format=flowed` options to ensure that no line in the message is never longer than lineLength.

    libmime.encodeFlowed(str [, lineLength]) → String

*   **str** Plaintext string that requires wrapping
*   **lineLength** (defaults to 76) Maximum length of a line

#### #decodeFlowed

Unwraps a plaintext string in format=flowed wrapping.

    libmime.decodeFlowed(str [, delSp]) → String

*   **str** Plaintext string with format=flowed to decode
*   **delSp** If true, delete leading spaces (delsp=yes)

### Headers

#### #decodeHeader

Unfolds a header line and splits it to key and value pair. The return value is in the form of `{key: 'subject', value: 'test'}`. The value is not mime word decoded, you need to do your own decoding based on the rules for the specific header key.

    libmime.decodeHeader(headerLine) → Object

*   **headerLine** - Single header line, might include linebreaks as well if folded

#### #decodeHeaders

Parses a block of header lines. Does not decode mime words as every header might have its own rules (eg. formatted email addresses and such).

Return value is an object of headers, where header keys are object keys and values are arrays.

    libmime.decodeHeaders(headers) → Object

*   **headers** - Headers string

#### #parseHeaderValue

Parses a header value with `key=value` arguments into a structured object. Useful when dealing with
`content-type` and such. Continuation encoded params are joined into mime encoded words.

    parseHeaderValue(valueString) → Object

*   **valueString** - a header value without the key

**Example**

```javascript
parseHeaderValue('content-type: text/plain; CHARSET="UTF-8"');
```

Outputs

```json
{
    "value": "text/plain",
    "params": {
        "charset": "UTF-8"
    }
}
```

#### #buildHeaderValue

Joins structured header value together as 'value; param1=value1; param2=value2'

    buildHeaderValue(structuredHeader) → String

*   **structuredHeader** - a header value formatted with `parseHeaderValue`

`filename` argument is encoded with continuation encoding if needed

#### #buildHeaderParam

Encodes and splits a header param value according to [RFC2231](https://tools.ietf.org/html/rfc2231#section-3) Parameter Value Continuations.

    libmime.buildHeaderParam(key, str, maxLength) → Array

*   **key** - Parameter key (eg. `filename`)
*   **str** - String or an Buffer value to encode
*   **maxLength** - Maximum length of the encoded string part (not line length). Defaults to 50

The method returns an array of encoded parts with the following structure: `[{key:'...', value: '...'}]`

**Example**

```
libmime.buildHeaderParam('filename', 'filename õäöü.txt', 20);
→
[ { key: 'filename*0*', value: 'utf-8\'\'filename%20' },
  { key: 'filename*1*', value: '%C3%B5%C3%A4%C3%B6' },
  { key: 'filename*2*', value: '%C3%BC.txt' } ]
```

This can be combined into a properly formatted header:

```
Content-disposition: attachment; filename*0*=utf-8''filename%20
  filename*1*=%C3%B5%C3%A4%C3%B6; filename*2*=%C3%BC.txt
```

### MIME Types

#### #detectExtension

Returns file extension for a content type string. If no suitable extensions are found, 'bin' is used as the default extension.

    libmime.detectExtension(mimeType) → String

*   **mimeType** - Content type to be checked for

**Example**

    libmime.detectExtension('image/jpeg') // returns 'jpeg'

#### #detectMimeType

Returns content type for a file extension. If no suitable content types are found, 'application/octet-stream' is used as the default content type

    libmime.detectMimeType(extension) → String

*   **extension** Extension (or filename) to be checked for

**Example**

    libmime.detectExtension('logo.jpg') // returns 'image/jpeg'

## License

**MIT**
