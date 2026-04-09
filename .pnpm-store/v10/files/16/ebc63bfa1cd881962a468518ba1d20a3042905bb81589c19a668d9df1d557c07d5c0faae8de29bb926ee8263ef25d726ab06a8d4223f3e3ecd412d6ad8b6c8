# varint

encode whole numbers to an array of [protobuf-style varint bytes](https://developers.google.com/protocol-buffers/docs/encoding#varints) and also decode them.

```javascript
var varint = require('varint')

var bytes = varint.encode(300) // === [0xAC, 0x02]
varint.decode(bytes) // 300
varint.decode.bytes // 2 (the last decode() call required 2 bytes)
```

## api

### varint = require('varint')

### varint.encode(num[, buffer=[], offset=0]) -> buffer

Encodes `num` into `buffer` starting at `offset`. returns `buffer`, with the encoded varint written into it. If `buffer` is not provided, it will default to a new array.

`varint.encode.bytes` will now be set to the number of bytes
modified.

### varint.decode(data[, offset=0]) -> number

decodes `data`, which can be either a buffer or array of integers, from position `offset` or default 0 and returns the decoded original integer.

Throws a `RangeError` when `data` does not represent a valid encoding.

### varint.decode.bytes

if you also require the length (number of bytes) that were required to decode the integer you can access it via `varint.decode.bytes`. this is an integer property that will tell you the number of bytes that the last .decode() call had to use to decode.

### varint.encode.bytes

similar to `decode.bytes` when encoding a number it can be useful to know how many bytes where written (especially if you pass an output array). you can access this via `varint.encode.bytes` which holds the number of bytes written in the last encode.


### varint.encodingLength(num)

returns the number of bytes this number will be encoded as, up to a maximum of 8.

## usage notes

If varint is passed a buffer that does not contain a valid end
byte, then `decode` will throw `RangeError`, and `decode.bytes` 
will be set to 0. If you are reading from a streaming source,
it's okay to pass an incomplete buffer into `decode`, detect this
case, and then concatenate the next buffer.

# License

MIT
