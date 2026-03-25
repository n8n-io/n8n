# d3-dsv

This module provides a parser and formatter for delimiter-separated values, most commonly [comma-](https://en.wikipedia.org/wiki/Comma-separated_values) (CSV) or tab-separated values (TSV). These tabular formats are popular with spreadsheet programs such as Microsoft Excel, and are often more space-efficient than JSON. This implementation is based on [RFC 4180](http://tools.ietf.org/html/rfc4180).

Comma (CSV) and tab (TSV) delimiters are built-in. For example, to parse:

```js
d3.csvParse("foo,bar\n1,2"); // [{foo: "1", bar: "2"}, columns: ["foo", "bar"]]
d3.tsvParse("foo\tbar\n1\t2"); // [{foo: "1", bar: "2"}, columns: ["foo", "bar"]]
```

Or to format:

```js
d3.csvFormat([{foo: "1", bar: "2"}]); // "foo,bar\n1,2"
d3.tsvFormat([{foo: "1", bar: "2"}]); // "foo\tbar\n1\t2"
```

To use a different delimiter, such as “|” for pipe-separated values, use [d3.dsvFormat](#dsvFormat):

```js
var psv = d3.dsvFormat("|");

console.log(psv.parse("foo|bar\n1|2")); // [{foo: "1", bar: "2"}, columns: ["foo", "bar"]]
```

For easy loading of DSV files in a browser, see [d3-fetch](https://github.com/d3/d3-fetch)’s [d3.csv](https://github.com/d3/d3-fetch/blob/master/README.md#csv) and [d3.tsv](https://github.com/d3/d3-fetch/blob/master/README.md#tsv) methods.

## Installing

If you use NPM, `npm install d3-dsv`. Otherwise, download the [latest release](https://github.com/d3/d3-dsv/releases/latest). You can also load directly from [d3js.org](https://d3js.org), either as a [standalone library](https://d3js.org/d3-dsv.v1.min.js) or as part of [D3](https://github.com/d3/d3). AMD, CommonJS, and vanilla environments are supported. In vanilla, a `d3` global is exported:

```html
<script src="https://d3js.org/d3-dsv.v1.min.js"></script>
<script>

var data = d3.csvParse(string);

</script>
```

[Try d3-dsv in your browser.](https://tonicdev.com/npm/d3-dsv)

## API Reference

<a name="csvParse" href="#csvParse">#</a> d3.<b>csvParse</b>(<i>string</i>[, <i>row</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/csv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)(",").[parse](#dsv_parse). Note: requires unsafe-eval [content security policy](#content-security-policy).

<a name="csvParseRows" href="#csvParseRows">#</a> d3.<b>csvParseRows</b>(<i>string</i>[, <i>row</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/csv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)(",").[parseRows](#dsv_parseRows).

<a name="csvFormat" href="#csvFormat">#</a> d3.<b>csvFormat</b>(<i>rows</i>[, <i>columns</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/csv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)(",").[format](#dsv_format).

<a name="csvFormatBody" href="#csvFormatBody">#</a> d3.<b>csvFormatBody</b>(<i>rows</i>[, <i>columns</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/csv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)(",").[formatBody](#dsv_formatBody).

<a name="csvFormatRows" href="#csvFormatRows">#</a> d3.<b>csvFormatRows</b>(<i>rows</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/csv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)(",").[formatRows](#dsv_formatRows).

<a name="csvFormatRow" href="#csvFormatRow">#</a> d3.<b>csvFormatRow</b>(<i>row</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/csv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)(",").[formatRow](#dsv_formatRow).

<a name="csvFormatValue" href="#csvFormatValue">#</a> d3.<b>csvFormatValue</b>(<i>value</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/csv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)(",").[formatValue](#dsv_formatValue).

<a name="tsvParse" href="#tsvParse">#</a> d3.<b>tsvParse</b>(<i>string</i>[, <i>row</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/tsv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)("\t").[parse](#dsv_parse). Note: requires unsafe-eval [content security policy](#content-security-policy).

<a name="tsvParseRows" href="#tsvParseRows">#</a> d3.<b>tsvParseRows</b>(<i>string</i>[, <i>row</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/tsv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)("\t").[parseRows](#dsv_parseRows).

<a name="tsvFormat" href="#tsvFormat">#</a> d3.<b>tsvFormat</b>(<i>rows</i>[, <i>columns</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/tsv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)("\t").[format](#dsv_format).

<a name="tsvFormatBody" href="#tsvFormatBody">#</a> d3.<b>tsvFormatBody</b>(<i>rows</i>[, <i>columns</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/tsv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)("\t").[formatBody](#dsv_formatBody).

<a name="tsvFormatRows" href="#tsvFormatRows">#</a> d3.<b>tsvFormatRows</b>(<i>rows</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/tsv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)("\t").[formatRows](#dsv_formatRows).

<a name="tsvFormatRow" href="#tsvFormatRow">#</a> d3.<b>tsvFormatRow</b>(<i>row</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/tsv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)("\t").[formatRow](#dsv_formatRow).

<a name="tsvFormatValue" href="#tsvFormatValue">#</a> d3.<b>tsvFormatValue</b>(<i>value</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/tsv.js "Source")

Equivalent to [dsvFormat](#dsvFormat)("\t").[formatValue](#dsv_formatValue).

<a name="dsvFormat" href="#dsvFormat">#</a> d3.<b>dsvFormat</b>(<i>delimiter</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/dsv.js)

Constructs a new DSV parser and formatter for the specified *delimiter*. The *delimiter* must be a single character (*i.e.*, a single 16-bit code unit); so, ASCII delimiters are fine, but emoji delimiters are not.

<a name="dsv_parse" href="#dsv_parse">#</a> *dsv*.<b>parse</b>(<i>string</i>[, <i>row</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/dsv.js "Source")

Parses the specified *string*, which must be in the delimiter-separated values format with the appropriate delimiter, returning an array of objects representing the parsed rows.

Unlike [*dsv*.parseRows](#dsv_parseRows), this method requires that the first line of the DSV content contains a delimiter-separated list of column names; these column names become the attributes on the returned objects. For example, consider the following CSV file:

```
Year,Make,Model,Length
1997,Ford,E350,2.34
2000,Mercury,Cougar,2.38
```

The resulting JavaScript array is:

```js
[
  {"Year": "1997", "Make": "Ford", "Model": "E350", "Length": "2.34"},
  {"Year": "2000", "Make": "Mercury", "Model": "Cougar", "Length": "2.38"}
]
```

The returned array also exposes a `columns` property containing the column names in input order (in contrast to Object.keys, whose iteration order is arbitrary). For example:

```js
data.columns; // ["Year", "Make", "Model", "Length"]
```

If the column names are not unique, only the last value is returned for each name; to access all values, use [*dsv*.parseRows](#dsv_parseRows) instead (see [example](https://observablehq.com/@d3/parse-csv-with-duplicate-column-names)).

If a *row* conversion function is not specified, field values are strings. For safety, there is no automatic conversion to numbers, dates, or other types. In some cases, JavaScript may coerce strings to numbers for you automatically (for example, using the `+` operator), but better is to specify a *row* conversion function. See [d3.autoType](#autoType) for a convenient *row* conversion function that infers and coerces common types like numbers and strings.

If a *row* conversion function is specified, the specified function is invoked for each row, being passed an object representing the current row (`d`), the index (`i`) starting at zero for the first non-header row, and the array of column names. If the returned value is null or undefined, the row is skipped and will be omitted from the array returned by *dsv*.parse; otherwise, the returned value defines the corresponding row object. For example:

```js
var data = d3.csvParse(string, function(d) {
  return {
    year: new Date(+d.Year, 0, 1), // lowercase and convert "Year" to Date
    make: d.Make, // lowercase
    model: d.Model, // lowercase
    length: +d.Length // lowercase and convert "Length" to number
  };
});
```

Note: using `+` rather than [parseInt](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/parseInt) or [parseFloat](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/parseFloat) is typically faster, though more restrictive. For example, `"30px"` when coerced using `+` returns `NaN`, while parseInt and parseFloat return `30`.

Note: requires unsafe-eval [content security policy](#content-security-policy).

<a name="dsv_parseRows" href="#dsv_parseRows">#</a> <i>dsv</i>.<b>parseRows</b>(<i>string</i>[, <i>row</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/dsv.js "Source")

Parses the specified *string*, which must be in the delimiter-separated values format with the appropriate delimiter, returning an array of arrays representing the parsed rows.

Unlike [*dsv*.parse](#dsv_parse), this method treats the header line as a standard row, and should be used whenever DSV content does not contain a header. Each row is represented as an array rather than an object. Rows may have variable length. For example, consider the following CSV file, which notably lacks a header line:

```
1997,Ford,E350,2.34
2000,Mercury,Cougar,2.38
```

The resulting JavaScript array is:

```js
[
  ["1997", "Ford", "E350", "2.34"],
  ["2000", "Mercury", "Cougar", "2.38"]
]
```

If a *row* conversion function is not specified, field values are strings. For safety, there is no automatic conversion to numbers, dates, or other types. In some cases, JavaScript may coerce strings to numbers for you automatically (for example, using the `+` operator), but better is to specify a *row* conversion function. See [d3.autoType](#autoType) for a convenient *row* conversion function that infers and coerces common types like numbers and strings.

If a *row* conversion function is specified, the specified function is invoked for each row, being passed an array representing the current row (`d`), the index (`i`) starting at zero for the first row, and the array of column names. If the returned value is null or undefined, the row is skipped and will be omitted from the array returned by *dsv*.parse; otherwise, the returned value defines the corresponding row object. For example:

```js
var data = d3.csvParseRows(string, function(d, i) {
  return {
    year: new Date(+d[0], 0, 1), // convert first colum column to Date
    make: d[1],
    model: d[2],
    length: +d[3] // convert fourth column to number
  };
});
```

In effect, *row* is similar to applying a [map](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/map) and [filter](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/filter) operator to the returned rows.

<a name="dsv_format" href="#dsv_format">#</a> <i>dsv</i>.<b>format</b>(<i>rows</i>[, <i>columns</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/dsv.js "Source")

Formats the specified array of object *rows* as delimiter-separated values, returning a string. This operation is the inverse of [*dsv*.parse](#dsv_parse). Each row will be separated by a newline (`\n`), and each column within each row will be separated by the delimiter (such as a comma, `,`). Values that contain either the delimiter, a double-quote (`"`) or a newline will be escaped using double-quotes.

If *columns* is not specified, the list of column names that forms the header row is determined by the union of all properties on all objects in *rows*; the order of columns is nondeterministic. If *columns* is specified, it is an array of strings representing the column names. For example:

```js
var string = d3.csvFormat(data, ["year", "make", "model", "length"]);
```

All fields on each row object will be coerced to strings. If the field value is null or undefined, the empty string is used. If the field value is a Date, the [ECMAScript date-time string format](https://www.ecma-international.org/ecma-262/9.0/index.html#sec-date-time-string-format) (a subset of ISO 8601) is used: for example, dates at UTC midnight are formatted as `YYYY-MM-DD`. For more control over which and how fields are formatted, first map *rows* to an array of array of string, and then use [*dsv*.formatRows](#dsv_formatRows).

<a name="dsv_formatBody" href="#dsv_formatBody">#</a> <i>dsv</i>.<b>formatBody</b>(<i>rows</i>[, <i>columns</i>]) [<>](https://github.com/d3/d3-dsv/blob/master/src/dsv.js "Source")

Equivalent to [*dsv*.format](#dsv_format), but omits the header row. This is useful, for example, when appending rows to an existing file.

<a name="dsv_formatRows" href="#dsv_formatRows">#</a> <i>dsv</i>.<b>formatRows</b>(<i>rows</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/dsv.js "Source")

Formats the specified array of array of string *rows* as delimiter-separated values, returning a string. This operation is the reverse of [*dsv*.parseRows](#dsv_parseRows). Each row will be separated by a newline (`\n`), and each column within each row will be separated by the delimiter (such as a comma, `,`). Values that contain either the delimiter, a double-quote (") or a newline will be escaped using double-quotes.

To convert an array of objects to an array of arrays while explicitly specifying the columns, use [*array*.map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map). For example:

```js
var string = d3.csvFormatRows(data.map(function(d, i) {
  return [
    d.year.getFullYear(), // Assuming d.year is a Date object.
    d.make,
    d.model,
    d.length
  ];
}));
```

If you like, you can also [*array*.concat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat) this result with an array of column names to generate the first row:

```js
var string = d3.csvFormatRows([[
    "year",
    "make",
    "model",
    "length"
  ]].concat(data.map(function(d, i) {
  return [
    d.year.getFullYear(), // Assuming d.year is a Date object.
    d.make,
    d.model,
    d.length
  ];
})));
```

<a name="dsv_formatRow" href="#dsv_formatRow">#</a> <i>dsv</i>.<b>formatRow</b>(<i>row</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/dsv.js "Source")

Formats a single array *row* of strings as delimiter-separated values, returning a string. Each column within the row will be separated by the delimiter (such as a comma, `,`). Values that contain either the delimiter, a double-quote (") or a newline will be escaped using double-quotes.

<a name="dsv_formatValue" href="#dsv_formatValue">#</a> <i>dsv</i>.<b>formatValue</b>(<i>value</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/dsv.js "Source")

Format a single *value* or string as a delimiter-separated value, returning a string. A value that contains either the delimiter, a double-quote (") or a newline will be escaped using double-quotes.

<a name="autoType" href="#autoType">#</a> d3.<b>autoType</b>(<i>object</i>) [<>](https://github.com/d3/d3-dsv/blob/master/src/autoType.js "Source")

Given an *object* (or array) representing a parsed row, infers the types of values on the *object* and coerces them accordingly, returning the mutated *object*. This function is intended to be used as a *row* accessor function in conjunction with [*dsv*.parse](#dsv_parse) and [*dsv*.parseRows](#dsv_parseRow). For example, consider the following CSV file:

```
Year,Make,Model,Length
1997,Ford,E350,2.34
2000,Mercury,Cougar,2.38
```

When used with [d3.csvParse](#csvParse),

```js
d3.csvParse(string, d3.autoType)
```

the resulting JavaScript array is:

```js
[
  {"Year": 1997, "Make": "Ford", "Model": "E350", "Length": 2.34},
  {"Year": 2000, "Make": "Mercury", "Model": "Cougar", "Length": 2.38}
]
```

Type inference works as follows. For each *value* in the given *object*, the [trimmed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim) value is computed; the value is then re-assigned as follows:

1. If empty, then `null`.
1. If exactly `"true"`, then `true`.
1. If exactly `"false"`, then `false`.
1. If exactly `"NaN"`, then `NaN`.
1. Otherwise, if [coercible to a number](https://www.ecma-international.org/ecma-262/9.0/index.html#sec-tonumber-applied-to-the-string-type), then a number.
1. Otherwise, if a [date-only or date-time string](https://www.ecma-international.org/ecma-262/9.0/index.html#sec-date-time-string-format), then a Date.
1. Otherwise, a string (the original untrimmed value).

Values with leading zeroes may be coerced to numbers; for example `"08904"` coerces to `8904`. However, extra characters such as commas or units (*e.g.*, `"$1.00"`, `"(123)"`, `"1,234"` or `"32px"`) will prevent number coercion, resulting in a string.

Date strings must be in ECMAScript’s subset of the [ISO 8601 format](https://en.wikipedia.org/wiki/ISO_8601). When a date-only string such as YYYY-MM-DD is specified, the inferred time is midnight UTC; however, if a date-time string such as YYYY-MM-DDTHH:MM is specified without a time zone, it is assumed to be local time.

Automatic type inference is primarily intended to provide safe, predictable behavior in conjunction with [*dsv*.format](#dsv_format) and [*dsv*.formatRows](#dsv_formatRows) for common JavaScript types. If you need different behavior, you should implement your own row accessor function.

For more, see [the d3.autoType notebook](https://observablehq.com/@d3/d3-autotype).

### Content Security Policy

If a [content security policy](http://www.w3.org/TR/CSP/) is in place, note that [*dsv*.parse](#dsv_parse) requires `unsafe-eval` in the `script-src` directive, due to the (safe) use of dynamic code generation for fast parsing. (See [source](https://github.com/d3/d3-dsv/blob/master/src/dsv.js).) Alternatively, use [*dsv*.parseRows](#dsv_parseRows).

### Byte-Order Marks

DSV files sometimes begin with a [byte order mark (BOM)](https://en.wikipedia.org/wiki/Byte_order_mark); saving a spreadsheet in CSV UTF-8 format from Microsoft Excel, for example, will include a BOM. On the web this is not usually a problem because the [UTF-8 decode algorithm](https://encoding.spec.whatwg.org/#utf-8-decode) specified in the Encoding standard removes the BOM. Node.js, on the other hand, [does not remove the BOM](https://github.com/nodejs/node-v0.x-archive/issues/1918) when decoding UTF-8.

If the BOM is not removed, the first character of the text is a zero-width non-breaking space. So if a CSV file with a BOM is parsed by [d3.csvParse](#csvParse), the first column’s name will begin with a zero-width non-breaking space. This can be hard to spot since this character is usually invisible when printed.

To remove the BOM before parsing, consider using [strip-bom](https://www.npmjs.com/package/strip-bom).

## Command Line Reference

### dsv2dsv

<a name="dsv2dsv" href="#dsv2dsv">#</a> <b>dsv2dsv</b> [<i>options…</i>] [<i>file</i>]

Converts the specified DSV input *file* to DSV (typically with a different delimiter or encoding). If *file* is not specified, defaults to reading from stdin. For example, to convert to CSV to TSV:

```
csv2tsv < example.csv > example.tsv
```

To convert windows-1252 CSV to utf-8 CSV:

```
dsv2dsv --input-encoding windows-1252 < latin1.csv > utf8.csv
```

<a name="dsv2dsv_help" href="dsv2dsv_help">#</a> dsv2dsv <b>-h</b>
<br><a href="dsv2dsv_help">#</a> dsv2dsv <b>--help</b>

Output usage information.

<a name="dsv2dsv_version" href="dsv2dsv_version">#</a> dsv2dsv <b>-V</b>
<br><a href="dsv2dsv_version">#</a> dsv2dsv <b>--version</b>

Output the version number.

<a name="dsv2dsv_out" href="dsv2dsv_out">#</a> dsv2dsv <b>-o</b> <i>file</i>
<br><a href="dsv2dsv_out">#</a> dsv2dsv <b>--out</b> <i>file</i>

Specify the output file name. Defaults to “-” for stdout.

<a name="dsv2dsv_input_delimiter" href="dsv2dsv_input_delimiter">#</a> dsv2dsv <b>-r</b> <i>delimiter</i>
<br><a href="dsv2dsv_input_delimiter">#</a> dsv2dsv <b>--input-delimiter</b> <i>delimiter</i>

Specify the input delimiter character. Defaults to “,” for reading CSV. (You can enter a tab on the command line by typing ⌃V.)

<a name="dsv2dsv_input_encoding" href="dsv2dsv_input_encoding">#</a> dsv2dsv <b>--input-encoding</b> <i>encoding</i>

Specify the input character encoding. Defaults to “utf8”.

<a name="dsv2dsv_output_delimiter" href="dsv2dsv_output_delimiter">#</a> dsv2dsv <b>-w</b> <i>delimiter</i>
<br><a href="dsv2dsv_output_delimiter">#</a> dsv2dsv <b>--output-delimiter</b> <i>delimiter</i>

Specify the output delimiter character. Defaults to “,” for writing CSV. (You can enter a tab on the command line by typing ⌃V.)

<a name="dsv2dsv_output_encoding" href="dsv2dsv_output_encoding">#</a> dsv2dsv <b>--output-encoding</b> <i>encoding</i>

Specify the output character encoding. Defaults to “utf8”.

<a name="csv2tsv" href="#csv2tsv">#</a> <b>csv2tsv</b> [<i>options…</i>] [<i>file</i>]

Equivalent to [dsv2dsv](#dsv2dsv), but the [output delimiter](#dsv2dsv_output_delimiter) defaults to the tab character (\t).

<a name="tsv2csv" href="#tsv2csv">#</a> <b>tsv2csv</b> [<i>options…</i>] [<i>file</i>]

Equivalent to [dsv2dsv](#dsv2dsv), but the [input delimiter](#dsv2dsv_output_delimiter) defaults to the tab character (\t).

### dsv2json

<a name="dsv2json" href="#dsv2json">#</a> <b>dsv2json</b> [<i>options…</i>] [<i>file</i>]

Converts the specified DSV input *file* to JSON. If *file* is not specified, defaults to reading from stdin. For example, to convert to CSV to JSON:

```
csv2json < example.csv > example.json
```

Or to convert CSV to a newline-delimited JSON stream:

```
csv2json -n < example.csv > example.ndjson
```

<a name="dsv2json_help" href="dsv2json_help">#</a> dsv2json <b>-h</b>
<br><a href="dsv2json_help">#</a> dsv2json <b>--help</b>

Output usage information.

<a name="dsv2json_version" href="dsv2json_version">#</a> dsv2json <b>-V</b>
<br><a href="dsv2json_version">#</a> dsv2json <b>--version</b>

Output the version number.

<a name="dsv2json_out" href="dsv2json_out">#</a> dsv2json <b>-o</b> <i>file</i>
<br><a href="dsv2json_out">#</a> dsv2json <b>--out</b> <i>file</i>

Specify the output file name. Defaults to “-” for stdout.

<a name="dsv2json_autotype" href="dsv2json_autotype">#</a> dsv2json <b>-a</b>
<br><a href="dsv2json_autotype">#</a> dsv2json <b>--auto-type</b>

Use type inference when parsing rows. See <a href="#autoType">d3.autoType</a> for how it works.

<a name="dsv2json_input_delimiter" href="dsv2json_input_delimiter">#</a> dsv2json <b>-r</b> <i>delimiter</i>
<br><a href="dsv2json_input_delimiter">#</a> dsv2json <b>--input-delimiter</b> <i>delimiter</i>

Specify the input delimiter character. Defaults to “,” for reading CSV. (You can enter a tab on the command line by typing ⌃V.)

<a name="dsv2json_input_encoding" href="dsv2json_input_encoding">#</a> dsv2json <b>--input-encoding</b> <i>encoding</i>

Specify the input character encoding. Defaults to “utf8”.

<a name="dsv2json_output_encoding" href="dsv2json_output_encoding">#</a> dsv2json <b>-r</b> <i>encoding</i>
<br><a href="dsv2json_output_encoding">#</a> dsv2json <b>--output-encoding</b> <i>encoding</i>

Specify the output character encoding. Defaults to “utf8”.

<a name="dsv2json_newline_delimited" href="dsv2json_newline_delimited">#</a> dsv2json <b>-n</b>
<br><a href="dsv2json_newline_delimited">#</a> dsv2json <b>--newline-delimited</b>

Output [newline-delimited JSON](https://github.com/mbostock/ndjson-cli) instead of a single JSON array.

<a name="csv2json" href="#csv2json">#</a> <b>csv2json</b> [<i>options…</i>] [<i>file</i>]

Equivalent to [dsv2json](#dsv2json).

<a name="tsv2json" href="#csv2json">#</a> <b>tsv2json</b> [<i>options…</i>] [<i>file</i>]

Equivalent to [dsv2json](#dsv2json), but the [input delimiter](#dsv2json_input_delimiter) defaults to the tab character (\t).

### json2dsv

<a name="json2dsv" href="#json2dsv">#</a> <b>json2dsv</b> [<i>options…</i>] [<i>file</i>]

Converts the specified JSON input *file* to DSV. If *file* is not specified, defaults to reading from stdin. For example, to convert to JSON to CSV:

```
json2csv < example.json > example.csv
```

Or to convert a newline-delimited JSON stream to CSV:

```
json2csv -n < example.ndjson > example.csv
```

<a name="json2dsv_help" href="json2dsv_help">#</a> json2dsv <b>-h</b>
<br><a href="json2dsv_help">#</a> json2dsv <b>--help</b>

Output usage information.

<a name="json2dsv_version" href="json2dsv_version">#</a> json2dsv <b>-V</b>
<br><a href="json2dsv_version">#</a> json2dsv <b>--version</b>

Output the version number.

<a name="json2dsv_out" href="json2dsv_out">#</a> json2dsv <b>-o</b> <i>file</i>
<br><a href="json2dsv_out">#</a> json2dsv <b>--out</b> <i>file</i>

Specify the output file name. Defaults to “-” for stdout.

<a name="json2dsv_input_encoding" href="json2dsv_input_encoding">#</a> json2dsv <b>--input-encoding</b> <i>encoding</i>

Specify the input character encoding. Defaults to “utf8”.

<a name="json2dsv_output_delimiter" href="json2dsv_output_delimiter">#</a> json2dsv <b>-w</b> <i>delimiter</i>
<br><a href="json2dsv_output_delimiter">#</a> json2dsv <b>--output-delimiter</b> <i>delimiter</i>

Specify the output delimiter character. Defaults to “,” for writing CSV. (You can enter a tab on the command line by typing ⌃V.)

<a name="json2dsv_output_encoding" href="json2dsv_output_encoding">#</a> json2dsv <b>--output-encoding</b> <i>encoding</i>

Specify the output character encoding. Defaults to “utf8”.

<a name="json2dsv_newline_delimited" href="json2dsv_newline_delimited">#</a> json2dsv <b>-n</b>
<br><a href="json2dsv_newline_delimited">#</a> json2dsv <b>--newline-delimited</b>

Read [newline-delimited JSON](https://github.com/mbostock/ndjson-cli) instead of a single JSON array.

<a name="json2csv" href="#json2csv">#</a> <b>json2csv</b> [<i>options…</i>] [<i>file</i>]

Equivalent to [json2dsv](#json2dsv).

<a name="json2tsv" href="#json2tsv">#</a> <b>json2tsv</b> [<i>options…</i>] [<i>file</i>]

Equivalent to [json2dsv](#json2dsv), but the [output delimiter](#json2dsv_output_delimiter) defaults to the tab character (\t).
