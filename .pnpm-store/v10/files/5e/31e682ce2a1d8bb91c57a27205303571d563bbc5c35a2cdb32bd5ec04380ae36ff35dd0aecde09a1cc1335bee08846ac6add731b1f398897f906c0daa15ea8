# CRC32 Stream

crc32-stream is a streaming CRC32 checksumer. It uses the [crc](https://www.npmjs.org/package/crc) module behind the scenes to reliably handle binary data and fancy character sets. Data is passed through untouched.

### Install

```bash
npm install crc32-stream --save
```

You can also use `npm install https://github.com/archiverjs/node-crc32-stream/archive/master.tar.gz` to test upcoming versions.

### Usage

#### CRC32Stream

Inherits [Transform Stream](http://nodejs.org/api/stream.html#stream_class_stream_transform) options and methods.

```js
const {CRC32Stream} = require('crc32-stream');

const source = fs.createReadStream('file.txt');
const checksum = new CRC32Stream();

checksum.on('end', function(err) {
  // do something with checksum.digest() here
});

// either pipe it
source.pipe(checksum);

// or write it
checksum.write('string');
checksum.end();
```

#### DeflateCRC32Stream

Inherits [zlib.DeflateRaw](http://nodejs.org/api/zlib.html#zlib_class_zlib_deflateraw) options and methods.

```js
const {DeflateCRC32Stream} = require('crc32-stream');

const source = fs.createReadStream('file.txt');
const checksum = new DeflateCRC32Stream();

checksum.on('end', function(err) {
  // do something with checksum.digest() here
});

// either pipe it
source.pipe(checksum);

// or write it
checksum.write('string');
checksum.end();
```

### Instance API

#### digest()

Returns the checksum digest in unsigned form.

#### hex()

Returns the hexadecimal representation of the checksum digest. (ie E81722F0)

#### size(compressed)

Returns the raw size/length of passed-through data.

If `compressed` is `true`, it returns compressed length instead. (DeflateCRC32Stream)

## Things of Interest

- [Changelog](https://github.com/archiverjs/node-crc32-stream/releases)
- [Contributing](https://github.com/archiverjs/node-crc32-stream/blob/master/CONTRIBUTING.md)
- [MIT License](https://github.com/archiverjs/node-crc32-stream/blob/master/LICENSE-MIT)
