# parquet.js

fully asynchronous, pure node.js implementation of the Parquet file format

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40unfinishedlabs%2Fparquet-js.svg)](https://badge.fury.io/js/%40dsnp%2Fparquetjs)

This package contains a fully asynchronous, pure JavaScript implementation of
the [Parquet](https://parquet.apache.org/) file format. The implementation conforms with the
[Parquet specification](https://github.com/apache/parquet-format) and is tested
for compatibility with Apache's Java [reference implementation](https://github.com/apache/parquet-mr).

**What is Parquet?**: Parquet is a column-oriented file format; it allows you to
write a large amount of structured data to a file, compress it and then read parts
of it back out efficiently. The Parquet format is based on [Google's Dremel paper](https://www.google.co.nz/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&cad=rja&uact=8&ved=0ahUKEwj_tJelpv3UAhUCm5QKHfJODhUQFggsMAE&url=http%3A%2F%2Fwww.vldb.org%2Fpvldb%2Fvldb2010%2Fpapers%2FR29.pdf&usg=AFQjCNGyMk3_JltVZjMahP6LPmqMzYdCkw).

## Forked Notice

This is a forked repository with code from various sources:

- Primary source [ironSource](https://github.com/ironSource/parquetjs) [npm: parquetjs](https://www.npmjs.com/package/parquetjs)
- Secondary source [ZJONSSON](https://github.com/ZJONSSON/parquetjs) [npm: parquetjs-lite](https://www.npmjs.com/package/parquetjs-lite)

## Installation

_parquet.js requires node.js >= 18.18.2_

```
  $ npm install @dsnp/parquetjs
```

### NodeJS

To use with nodejs:

```javascript
import parquetjs from '@dsnp/parquetjs';
```

### Browser with Bundler

To use in a browser with a bundler, depending on your needs, write the appropriate plugin or resolver to point to either the Common JS or ES Module version:

```javascript
// Common JS
'node_modules/@dsnp/parquetjs/dist/browser/parquetjs.cjs';
// ES Modules
'node_modules/@dsnp/parquetjs/dist/browser/parquetjs.esm';
```

or:

```javascript
// Common JS
import parquetjs from '@dsnp/parquetjs/dist/browser/parquetjs.cjs';
// ES Modules
import parquetjs from '@dsnp/parquetjs/dist/browser/parquetjs.esm';
```

### Browser Direct: ES Modules

To use directly in the browser without a bundler using ES Modules:

1. Build the package: `npm install && npm run build:browser`
2. Copy to `dist/browser/parquetjs.esm.js` the server
3. Use it in your html or other ES Modules:
   ```html
   <script type="module">
     import parquetjs from '../parquet.esm.js';
     // Use parquetjs
   </script>
   ```

### Browser Direct: Plain Ol' JavaScript

To use directly in the browser without a bundler or ES Modules:

1. Build the package: `npm install && npm run build:browser`
2. Copy to `dist/browser/parquetjs.js` the server
3. Use the global `parquetjs` variable to access parquetjs functions
   ```html
   <script>
     // console.log(parquetjs)
   </script>
   ```

## Usage: Writing files

Once you have installed the parquet.js library, you can import it as a single
module:

```js
var parquet = require('@dsnp/parquetjs');
```

Parquet files have a strict schema, similar to tables in a SQL database. So,
in order to produce a Parquet file we first need to declare a new schema. Here
is a simple example that shows how to instantiate a `ParquetSchema` object:

### Native Schema Definition

```js
// declare a schema for the `fruits` table
var schema = new parquet.ParquetSchema({
  name: { type: 'UTF8' },
  quantity: { type: 'INT64' },
  price: { type: 'DOUBLE' },
  date: { type: 'TIMESTAMP_MILLIS' },
  in_stock: { type: 'BOOLEAN' },
});
```

### Helper Functions

```js
var schema = new parquet.ParquetSchema({
  name: parquet.ParquetFieldBuilder.createStringField(),
  quantity: parquet.ParquetFieldBuilder.createIntField(64),
  price: parquet.ParquetFieldBuilder.createDoubleField(),
  date: parquet.ParquetFieldBuilder.createTimestampField(),
  in_stock: parquet.ParquetFieldBuilder.createBooleanField(),
});
```

### JSON Schema

```js
// declare a schema for the `fruits` JSON Schema
var schema = new parquet.ParquetSchema.fromJsonSchema({
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    quantity: {
      type: 'integer',
    },
    price: {
      type: 'number',
    },
    date: {
      type: 'string',
      format: 'date-time',
    },
    in_stock: {
      type: 'boolean',
    },
  },
  required: ['name', 'quantity', 'price', 'date', 'in_stock'],
});
```

Note that the Parquet schema supports nesting, so you can store complex, arbitrarily
nested records into a single row (more on that later) while still maintaining good
compression.

Once we have a schema, we can create a `ParquetWriter` object. The writer will
take input rows as JSON objects, convert them to the Parquet format and store
them on disk.

```js
// create new ParquetWriter that writes to 'fruits.parquet`
var writer = await parquet.ParquetWriter.openFile(schema, 'fruits.parquet');

// append a few rows to the file
await writer.appendRow({ name: 'apples', quantity: 10, price: 2.5, date: new Date(), in_stock: true });
await writer.appendRow({ name: 'oranges', quantity: 10, price: 2.5, date: new Date(), in_stock: true });
```

Once we are finished adding rows to the file, we have to tell the writer object
to flush the metadata to disk and close the file by calling the `close()` method:

### Adding bloom filters

Bloom filters can be added to multiple columns as demonstrated below:

```js
const options = {
  bloomFilters: [
    {
      column: 'name',
      numFilterBytes: 1024,
    },
    {
      column: 'quantity',
      numFilterBytes: 1024,
    },
  ],
};

var writer = await parquet.ParquetWriter.openFile(schema, 'fruits.parquet', options);
```

By default, not passing any additional options calculates the optimal number of blocks according to the default number of distinct values (128\*1024) and default false positive probability (0.001), which gives a filter byte size of 29,920.

The following options are provided to have the ability to adjust the split-block bloom filter settings.

`numFilterBytes` - sets the desire size of bloom filter in bytes. Defaults to 128 _ 1024 _ 1024 bits.

`falsePositiveRate` - set the desired false positive percentage for bloom filter. Defaults to 0.001.

`numDistinct` - sets the number of distinct values. Defaults to 128 \* 1024 bits.

Note that if numFilterBytes is provided then falsePositiveRate and numDistinct options are ignored.

## Usage: Reading files

A parquet reader allows retrieving the rows from a parquet file in order.
The basic usage is to create a reader and then retrieve a cursor/iterator
which allows you to consume row after row until all rows have been read.

You may open more than one cursor and use them concurrently. All cursors become
invalid once close() is called on
the reader object.

```js
// create new ParquetReader that reads from 'fruits.parquet`
let reader = await parquet.ParquetReader.openFile('fruits.parquet');

// create a new cursor
let cursor = reader.getCursor();

// read all records from the file and print them
let record = null;
while ((record = await cursor.next())) {
  console.log(record);
}
```

When creating a cursor, you can optionally request that only a subset of the
columns should be read from disk. For example:

```js
// create a new cursor that will only return the `name` and `price` columns
let cursor = reader.getCursor(['name', 'price']);
```

It is important that you call close() after you are finished reading the file to
avoid leaking file descriptors.

```js
await reader.close();
```

### Reading a bloom filter

Bloom filters can be fetched from a parquet file by creating a reader
and calling `getBloomFiltersFor`.

```js
// create new ParquetReader that reads from 'fruits.parquet`
let reader = await parquet.ParquetReader.openFile('fruits.parquet');

// fetches bloom filter for the columns provided.
const bloomFilters = reader.getBloomFiltersFor(['name']);

=> {
  name: [
    {
      rowGroupIndex: 0
      columnName: 'name',
      sbbf: SplitBlockBloomFilter<instance>
    }
  ]
}

```

Calling `getBloomFiltersFor` on the reader returns an object with the keys being a column name and value being an array of length equal to the number of row groups that the column spans.

Given the SplitBlockBloomFilter<instance> inclusion of a value in the filter can be checked as follows:

```js
const sbbf = bloomFilters.name[0].ssbf;

sbbf.check('apples') ===> true
```

### Reading data from a url

Parquet files can be read from a url without having to download the whole file.
You will have to supply the request library as a first argument and the request parameters
as a second argument to the function `parquetReader.openUrl`.

```js
const request = require('request');
let reader = await parquet.ParquetReader.openUrl(request, 'https://domain/fruits.parquet');
```

### Reading data from S3

Parquet files can be read from an S3 object without having to download the whole file.
You will have to supply the aws-sdk client as first argument and the bucket/key information
as second argument to the function `parquetReader.openS3`.

```js
const AWS = require('aws-sdk');
const client = new AWS.S3({
  accessKeyId: 'xxxxxxxxxxx',
  secretAccessKey: 'xxxxxxxxxxx',
});

const params = {
  Bucket: 'xxxxxxxxxxx',
  Key: 'xxxxxxxxxxx',
};

let reader = await parquet.ParquetReader.openS3(client, params);
```

### Reading data from a buffer

If the complete parquet file is in buffer it can be read directly from memory without incurring any additional I/O.

```js
const file = fs.readFileSync('fruits.parquet');
let reader = await parquet.ParquetReader.openBuffer(file);
```

## Encodings

Internally, the Parquet format will store values from each field as consecutive
arrays which can be compressed/encoded using a number of schemes.

#### Plain Encoding (PLAIN)

The most simple encoding scheme is the PLAIN encoding. It simply stores the
values as they are without any compression. The PLAIN encoding is currently
the default for all types except `BOOLEAN`:

```js
var schema = new parquet.ParquetSchema({
  name: { type: 'UTF8', encoding: 'PLAIN' },
});
```

#### Run Length Encoding (RLE)

The Parquet hybrid run length and bitpacking encoding allows to compress runs
of numbers very efficiently. Note that the RLE encoding can only be used in
combination with the `BOOLEAN`, `INT32` and `INT64` types. The RLE encoding
requires an additional `typeLength` parameter that contains the maximum number of
bits required to store the largest value of the field.

```js
var schema = new parquet.ParquetSchema({
  age: { type: 'UINT_32', encoding: 'RLE', typeLength: 7 },
});
```

### Optional Fields

By default, all fields are required to be present in each row. You can also mark
a field as 'optional' which will let you store rows with that field missing:

```js
var schema = new parquet.ParquetSchema({
  name: { type: 'UTF8' },
  quantity: { type: 'INT64', optional: true },
});

var writer = await parquet.ParquetWriter.openFile(schema, 'fruits.parquet');
await writer.appendRow({ name: 'apples', quantity: 10 });
await writer.appendRow({ name: 'banana' }); // not in stock
```

### Nested Rows & Arrays

Parquet supports nested schemas that allow you to store rows that have a more
complex structure than a simple tuple of scalar values. To declare a schema
with a nested field, omit the `type` in the column definition and add a `fields`
list instead:

Consider this example, which allows us to store a more advanced "fruits" table
where each row contains a name, a list of colours and a list of "stock" objects.

```js
// advanced fruits table
var schema = new parquet.ParquetSchema({
  name: { type: 'UTF8' },
  colours: { type: 'UTF8', repeated: true },
  stock: {
    repeated: true,
    fields: {
      price: { type: 'DOUBLE' },
      quantity: { type: 'INT64' },
    },
  },
});

// the above schema allows us to store the following rows:
var writer = await parquet.ParquetWriter.openFile(schema, 'fruits.parquet');

await writer.appendRow({
  name: 'banana',
  colours: ['yellow'],
  stock: [
    { price: 2.45, quantity: 16 },
    { price: 2.6, quantity: 420 },
  ],
});

await writer.appendRow({
  name: 'apple',
  colours: ['red', 'green'],
  stock: [
    { price: 1.2, quantity: 42 },
    { price: 1.3, quantity: 230 },
  ],
});

await writer.close();

// reading nested rows with a list of explicit columns
let reader = await parquet.ParquetReader.openFile('fruits.parquet');

let cursor = reader.getCursor([['name'], ['stock', 'price']]);
let record = null;
while ((record = await cursor.next())) {
  console.log(record);
}

await reader.close();
```

It might not be obvious why one would want to implement or use such a feature when
the same can - in principle - be achieved by serializing the record using JSON
(or a similar scheme) and then storing it into a UTF8 field:

Putting aside the philosophical discussion on the merits of strict typing,
knowing about the structure and subtypes of all records (globally) means we do not
have to duplicate this metadata (i.e. the field names) for every record. On top
of that, knowing about the type of a field allows us to compress the remaining
data more efficiently.

### Nested Lists for Hive / Athena

Lists have to be annotated to be queriable with AWS Athena. See [parquet-format](https://github.com/apache/parquet-format/blob/master/LogicalTypes.md#lists) for more detail and a full working example with comments in the test directory ([`test/list.js`](test/list.js))

### List of Supported Types & Encodings

We aim to be feature-complete and add new features as they are added to the
Parquet specification; this is the list of currently implemented data types and
encodings:

<table>
  <tr><th>Logical Type</th><th>Primitive Type</th><th>Encodings</th></tr>
  <tr><td>UTF8</td><td>BYTE_ARRAY</td><td>PLAIN</td></tr>
  <tr><td>JSON</td><td>BYTE_ARRAY</td><td>PLAIN</td></tr>
  <tr><td>BSON</td><td>BYTE_ARRAY</td><td>PLAIN</td></tr>
  <tr><td>BYTE_ARRAY</td><td>BYTE_ARRAY</td><td>PLAIN</td></tr>
  <tr><td>TIME_MILLIS</td><td>INT32</td><td>PLAIN, RLE</td></tr>
  <tr><td>TIME_MICROS</td><td>INT64</td><td>PLAIN, RLE</td></tr>
  <tr><td>TIMESTAMP_MILLIS</td><td>INT64</td><td>PLAIN, RLE</td></tr>
  <tr><td>TIMESTAMP_MICROS</td><td>INT64</td><td>PLAIN, RLE</td></tr>
  <tr><td>BOOLEAN</td><td>BOOLEAN</td><td>PLAIN, RLE</td></tr>
  <tr><td>FLOAT</td><td>FLOAT</td><td>PLAIN</td></tr>
  <tr><td>DOUBLE</td><td>DOUBLE</td><td>PLAIN</td></tr>
  <tr><td>INT32</td><td>INT32</td><td>PLAIN, RLE</td></tr>
  <tr><td>INT64</td><td>INT64</td><td>PLAIN, RLE</td></tr>
  <tr><td>INT96</td><td>INT96</td><td>PLAIN</td></tr>
  <tr><td>INT_8</td><td>INT32</td><td>PLAIN, RLE</td></tr>
  <tr><td>INT_16</td><td>INT32</td><td>PLAIN, RLE</td></tr>
  <tr><td>INT_32</td><td>INT32</td><td>PLAIN, RLE</td></tr>
  <tr><td>INT_64</td><td>INT64</td><td>PLAIN, RLE</td></tr>
  <tr><td>UINT_8</td><td>INT32</td><td>PLAIN, RLE</td></tr>
  <tr><td>UINT_16</td><td>INT32</td><td>PLAIN, RLE</td></tr>
  <tr><td>UINT_32</td><td>INT32</td><td>PLAIN, RLE</td></tr>
  <tr><td>UINT_64</td><td>INT64</td><td>PLAIN, RLE</td></tr>
</table>

## Buffering & Row Group Size

When writing a Parquet file, the `ParquetWriter` will buffer rows in memory
until a row group is complete (or `close()` is called) and then write out the row
group to disk.

The size of a row group is configurable by the user and controls the maximum
number of rows that are buffered in memory at any given time as well as the number
of rows that are co-located on disk:

```js
var writer = await parquet.ParquetWriter.openFile(schema, 'fruits.parquet');
writer.setRowGroupSize(8192);
```

## Browser Tests

To run the browser tests (folder: `test/browser`) in a specific browser:

1. `npm i`
2. `npm run build:browser`
3. `npx serve .`
4. `open http://localhost:3000/test/browser/` in your preferred browser (Trailing `/` is required)

## Dependencies

Parquet uses [thrift](https://thrift.apache.org/) to encode the schema and other
metadata, but the actual data does not use thrift.

## Notes

Currently parquet-cpp doesn't fully support DATA_PAGE_V2. You can work around this
by setting the useDataPageV2 option to false.
