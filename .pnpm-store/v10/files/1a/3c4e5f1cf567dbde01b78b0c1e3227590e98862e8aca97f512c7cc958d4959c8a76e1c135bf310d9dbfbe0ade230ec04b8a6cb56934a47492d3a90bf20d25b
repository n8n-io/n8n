# postgres-bytea [![Build Status](https://travis-ci.org/bendrucker/postgres-bytea.svg?branch=master)](https://travis-ci.org/bendrucker/postgres-bytea) [![Greenkeeper badge](https://badges.greenkeeper.io/bendrucker/postgres-bytea.svg)](https://greenkeeper.io/)

> Decode/encode Postgres bytea strings to Buffers


## Install

```sh
npm install postgres-bytea
```

## Usage

### Decoding

To decode a bytea string into a buffer:

```js
const bytea = require('postgres-bytea')

// bytea hex format
bytea.decode('\\x1234') // <Buffer 12 34>

// bytea escape format
bytea.decode('\\000\\100\\200') // <Buffer 00 40 80>
```

The `decode` function supports both the hex format used in Postgres 9+ and the escape format used in Postgres 8 and earlier. It automatically detects the format from the incoming data.

For backward compatibility, `decode` is also the default export from the package.

### Decoding (Stream)

To decode a bytea hex stream into binary:

```js
const bytea = require('postgres-bytea')

readable.pipe(new bytea.Decoder())
```

`Decoder` expects a double-escaped `\\x` prefix to allow reading from a `COPY TO` statement.

### Encoding (Stream)


```js
const bytea = require('postgres-bytea')

readable.pipe(new bytea.Encoder())
```

`Encoder` adds a double-escaped `\\x` prefix to allow writing to a `COPY FROM` statement.

## API

#### `bytea.decode(input)` -> `buffer`

##### input

*Required*  
Type: `string`

A Postgres bytea binary string.

#### `new bytea.Decoder()` -> `stream.Transform`

Creates a bytea decoder stream that emits buffer chunks.

#### `new bytea.Encoder()` -> `stream.Transform`

Creates a bytea encoder stream that receives buffer chunks and emits them as bytea strings.

## Prefix Escaping

> The “hex” format encodes binary data as 2 hexadecimal digits per byte, most significant nibble first. The entire string is preceded by the sequence \x (to distinguish it from the escape format). In some contexts, the initial backslash may need to be escaped by doubling it (see Section 4.1.2.1).
>
> https://www.postgresql.org/docs/12/datatype-binary.html#id-1.5.7.12.9

A `SELECT` statement returns bytea values using the single-escaped `\x` prefix. The `COPY TO` and `COPY FROM` commands expect and return bytea values with the double-escaped `\\x` prefix. 

`bytea.decode` expects the single-escaped prefix. The `Decoder` and `Encoder` streams expect the double-escaped prefix, since they are most useful in `COPY FROM` and `COPY TO` statements.

## License

MIT © [Ben Drucker](http://bendrucker.me)
