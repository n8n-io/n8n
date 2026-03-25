# tmp-promise

[![CircleCI](https://circleci.com/gh/benjamingr/tmp-promise.svg?style=svg)](https://circleci.com/gh/benjamingr/tmp-promise)
[![npm version](https://badge.fury.io/js/tmp-promise.svg)](https://badge.fury.io/js/tmp-promise)

A simple utility for creating temporary files or directories.

The [tmp](https://github.com/raszi/node-tmp) package with promises support. If you want to use `tmp` with `async/await` then this helper might be for you.

This documentation is mostly copied from that package's - but with promise usage instead of callback usage adapted.

## Installation

    npm i tmp-promise

**Note:** Node.js 8+ is supported - older versions of Node.js are not supported by the Node.js foundation. If you need to use an older version of Node.js install tmp-promise@1.10

    npm i tmp-promise@1.1.0

## About

This adds promises support to a [widely used library][2]. This package is used to create temporary files and directories in a [Node.js][1] environment.
 

tmp-promise offers both an asynchronous and a synchronous API. For all API calls, all
the parameters are optional.

Internally, tmp uses crypto for determining random file names, or, when using templates, a six letter random identifier. And just in case that you do not have that much entropy left on your system, tmp will fall back to pseudo random numbers.

You can set whether you want to remove the temporary file on process exit or not, and the destination directory can also be set.

tmp-promise also uses promise [disposers](http://stackoverflow.com/questions/28915677/what-is-the-promise-disposer-pattern) to provide a nice way to perform cleanup when you're done working with the files.

## Usage (API Reference)

### Asynchronous file creation

Simple temporary file creation, the file will be closed and unlinked on process exit.

With Node.js 10 and es - modules:

```js
import { file } from 'tmp-promise'

(async () => {
  const {fd, path, cleanup} = await file();
  // work with file here in fd
  cleanup();
})(); 
```

Or the older way:

```javascript
var tmp = require('tmp-promise');

tmp.file().then(o => {  
  console.log("File: ", o.path);
  console.log("Filedescriptor: ", o.fd);
  
  // If we don't need the file anymore we could manually call cleanup
  // But that is not necessary if we didn't pass the keep option because the library
  // will clean after itself.
  o.cleanup();
});
```

Simple temporary file creation with a [disposer](http://stackoverflow.com/questions/28915677/what-is-the-promise-disposer-pattern):

With Node.js 10 and es - modules:

```js
import { withFile } from 'tmp-promise'

withFile(async ({path, fd}) => {
  // when this function returns or throws - release the file 
  await doSomethingWithFile(db);
});
```

Or the older way:

```js
tmp.withFile(o => {
  console.log("File: ", o.path);
  console.log("Filedescriptor: ", o.fd);
  // the file remains opens until the below promise resolves
  return somePromiseReturningFn();
}).then(v => {
  // file is closed here automatically, v is the value of somePromiseReturningFn
});
```


### Synchronous file creation

A synchronous version of the above.

```javascript
var tmp = require('tmp-promise');

var tmpobj = tmp.fileSync();
console.log("File: ", tmpobj.name);
console.log("Filedescriptor: ", tmpobj.fd);
  
// If we don't need the file anymore we could manually call the removeCallback
// But that is not necessary if we didn't pass the keep option because the library
// will clean after itself.
tmpobj.removeCallback();
```

Note that this might throw an exception if either the maximum limit of retries
for creating a temporary name fails, or, in case that you do not have the permission
to write to the directory where the temporary file should be created in.

### Asynchronous directory creation

Simple temporary directory creation, it will be removed on process exit.

If the directory still contains items on process exit, then it won't be removed.

```javascript
var tmp = require('tmp-promise');

tmp.dir().then(o => {
  console.log("Dir: ", o.path);
  
  // Manual cleanup
  o.cleanup();
});
```

If you want to cleanup the directory even when there are entries in it, then
you can pass the `unsafeCleanup` option when creating it.

You can also use a [disposer](http://stackoverflow.com/questions/28915677/what-is-the-promise-disposer-pattern) here which takes care of cleanup automatically: 

```javascript
var tmp = require('tmp-promise');

tmp.withDir(o => {
  console.log("Dir: ", o.path);
  
  // automatic cleanup when the below promise resolves
  return somePromiseReturningFn(); 
}).then(v => {
  // the directory has been cleaned here
});
```

### Synchronous directory creation

A synchronous version of the above.

```javascript
var tmp = require('tmp-promise');

var tmpobj = tmp.dirSync();
console.log("Dir: ", tmpobj.name);
// Manual cleanup
tmpobj.removeCallback();
```

Note that this might throw an exception if either the maximum limit of retries
for creating a temporary name fails, or, in case that you do not have the permission
to write to the directory where the temporary directory should be created in.

### Asynchronous filename generation

It is possible with this library to generate a unique filename in the specified
directory.

```javascript
var tmp = require('tmp-promise');

tmp.tmpName().then(path => {
    console.log("Created temporary filename: ", path);
});
```

### Synchronous filename generation

A synchronous version of the above.

```javascript
var tmp = require('tmp-promise');

var name = tmp.tmpNameSync();
console.log("Created temporary filename: ", name);
```

## Advanced usage

### Asynchronous file creation

Creates a file with mode `0644`, prefix will be `prefix-` and postfix will be `.txt`.

```javascript
var tmp = require('tmp-promise');

tmp.file({ mode: 0644, prefix: 'prefix-', postfix: '.txt' }).then(o => {
  console.log("File: ", o.path);
  console.log("Filedescriptor: ", o.fd); 
});
```

### Synchronous file creation

A synchronous version of the above.

```javascript
var tmp = require('tmp-promise');

var tmpobj = tmp.fileSync({ mode: 0644, prefix: 'prefix-', postfix: '.txt' });
console.log("File: ", tmpobj.name);
console.log("Filedescriptor: ", tmpobj.fd);
```

### Asynchronous directory creation

Creates a directory with mode `0755`, prefix will be `myTmpDir_`.

```javascript
var tmp = require('tmp-promise');

tmp.dir({ mode: 0750, prefix: 'myTmpDir_' }).then(o => {
  console.log("Dir: ", o.path);
});
```

### Synchronous directory creation

Again, a synchronous version of the above.

```javascript
var tmp = require('tmp-promise');

var tmpobj = tmp.dirSync({ mode: 0750, prefix: 'myTmpDir_' });
console.log("Dir: ", tmpobj.name);
```


### mkstemp like, asynchronously

Creates a new temporary directory with mode `0700` and filename like `/tmp/tmp-nk2J1u`.

```javascript
var tmp = require('tmp-promise');
tmp.dir({ template: '/tmp/tmp-XXXXXX' }).then(console.log);
```


### mkstemp like, synchronously

This will behave similarly to the asynchronous version.

```javascript
var tmp = require('tmp-promise');

var tmpobj = tmp.dirSync({ template: '/tmp/tmp-XXXXXX' });
console.log("Dir: ", tmpobj.name);
```

### Asynchronous filename generation

The `tmpName()` function accepts the `prefix`, `postfix`, `dir`, etc. parameters also:

```javascript
var tmp = require('tmp-promise');

tmp.tmpName({ template: '/tmp/tmp-XXXXXX' }).then(path =>
    console.log("Created temporary filename: ", path);
);
```

### Synchronous filename generation

The `tmpNameSync()` function works similarly to `tmpName()`.

```javascript
var tmp = require('tmp-promise');
var tmpname = tmp.tmpNameSync({ template: '/tmp/tmp-XXXXXX' });
console.log("Created temporary filename: ", tmpname);
```


## Graceful cleanup

One may want to cleanup the temporary files even when an uncaught exception
occurs. To enforce this, you can call the `setGracefulCleanup()` method:

```javascript
var tmp = require('tmp');

tmp.setGracefulCleanup();
```

## Options

All options are optional :)

  * `mode`: the file mode to create with, it fallbacks to `0600` on file creation and `0700` on directory creation
  * `prefix`: the optional prefix, fallbacks to `tmp-` if not provided
  * `postfix`: the optional postfix, fallbacks to `.tmp` on file creation
  * `template`: [`mkstemp`][3] like filename template, no default
  * `dir`: the optional temporary directory, fallbacks to system default (guesses from environment)
  * `tries`: how many times should the function try to get a unique filename before giving up, default `3`
  * `keep`: signals that the temporary file or directory should not be deleted on exit, default is `false`, means delete
    * Please keep in mind that it is recommended in this case to call the provided `cleanupCallback` function manually.
  * `unsafeCleanup`: recursively removes the created temporary directory, even when it's not empty. default is `false`



[1]: http://nodejs.org/
[2]: https://www.npmjs.com/browse/depended/tmp
[3]: http://www.kernel.org/doc/man-pages/online/pages/man3/mkstemp.3.html
