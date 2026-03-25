# ZipStream

zip-stream is a streaming zip archive generator based on the `ZipArchiveOutputStream` prototype found in the [compress-commons](https://www.npmjs.org/package/compress-commons) project.

It was originally created to be a successor to [zipstream](https://npmjs.org/package/zipstream).

Visit the [API documentation](http://archiverjs.com/zip-stream) for a list of all methods available.

### Install

```bash
npm install zip-stream --save
```

You can also use `npm install https://github.com/archiverjs/node-zip-stream/archive/master.tar.gz` to test upcoming versions.

### Usage

This module is meant to be wrapped internally by other modules and therefore lacks any queue management. This means you have to wait until the previous entry has been fully consumed to add another. Nested callbacks should be used to add multiple entries. There are modules like [async](https://npmjs.org/package/async) that ease the so called "callback hell".

If you want a module that handles entry queueing and much more, you should check out [archiver](https://npmjs.org/package/archiver) which uses this module internally.

```js
const Packer = require('zip-stream');
const archive = new Packer(); // OR new Packer(options)

archive.on('error', function(err) {
  throw err;
});

// pipe archive where you want it (ie fs, http, etc)
// listen to the destination's end, close, or finish event

archive.entry('string contents', { name: 'string.txt' }, function(err, entry) {
  if (err) throw err;
  archive.entry(null, { name: 'directory/' }, function(err, entry) {
    if (err) throw err;
    archive.finish();
  });
});
```

## Credits

Concept inspired by Antoine van Wel's [zipstream](https://npmjs.org/package/zipstream) module, which is no longer being updated.
