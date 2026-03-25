# Archiver

A streaming interface for archive generation

Visit the [API documentation](https://www.archiverjs.com/) for a list of all methods available.

## Install

```bash
npm install archiver --save
```

## Quick Start

```js
// require modules
const fs = require('fs');
const archiver = require('archiver');

// create a file to stream archive data to.
const output = fs.createWriteStream(__dirname + '/example.zip');
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

// listen for all archive data to be written
// 'close' event is fired only when a file descriptor is involved
output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
output.on('end', function() {
  console.log('Data has been drained');
});

// good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    // log warning
  } else {
    // throw error
    throw err;
  }
});

// good practice to catch this error explicitly
archive.on('error', function(err) {
  throw err;
});

// pipe archive data to the file
archive.pipe(output);

// append a file from stream
const file1 = __dirname + '/file1.txt';
archive.append(fs.createReadStream(file1), { name: 'file1.txt' });

// append a file from string
archive.append('string cheese!', { name: 'file2.txt' });

// append a file from buffer
const buffer3 = Buffer.from('buff it!');
archive.append(buffer3, { name: 'file3.txt' });

// append a file
archive.file('file1.txt', { name: 'file4.txt' });

// append files from a sub-directory and naming it `new-subdir` within the archive
archive.directory('subdir/', 'new-subdir');

// append files from a sub-directory, putting its contents at the root of archive
archive.directory('subdir/', false);

// append files from a glob pattern
archive.glob('file*.txt', {cwd:__dirname});

// finalize the archive (ie we are done appending files but streams have to finish yet)
// 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
archive.finalize();
```

## Formats

Archiver ships with out of the box support for TAR and ZIP archives.

You can register additional formats with `registerFormat`.

You can check if format already exists before to register a new one with `isRegisteredFormat`.
