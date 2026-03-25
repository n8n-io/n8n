# MIME Type Parsing

## `MIMEType` interface

* **type** `string`
* **subtype** `string`
* **parameters** `Map<string, string>`
* **essence** `string`

## `parseMIMEType(input)`

Implements [parse a MIME type](https://mimesniff.spec.whatwg.org/#parse-a-mime-type).

Parses a MIME type, returning its type, subtype, and any associated parameters. If the parser can't parse an input it returns the string literal `'failure'`.

```js
import { parseMIMEType } from 'undici'

parseMIMEType('text/html; charset=gbk')
// {
//   type: 'text',
//   subtype: 'html',
//   parameters: Map(1) { 'charset' => 'gbk' },
//   essence: 'text/html'
// }
```

Arguments:

* **input** `string`

Returns: `MIMEType|'failure'`

## `serializeAMimeType(input)`

Implements [serialize a MIME type](https://mimesniff.spec.whatwg.org/#serialize-a-mime-type).

Serializes a MIMEType object.

```js
import { serializeAMimeType } from 'undici'

serializeAMimeType({
  type: 'text',
  subtype: 'html',
  parameters: new Map([['charset', 'gbk']]),
  essence: 'text/html'
})
// text/html;charset=gbk

```

Arguments:

* **mimeType** `MIMEType`

Returns: `string`
