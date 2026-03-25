# read-package-json

This is the thing that npm uses to read package.json files.  It
validates some stuff, and loads some default things.

It keeps a cache of the files you've read, so that you don't end
up reading the same package.json file multiple times.

Note that if you just want to see what's literally in the package.json
file, you can usually do `var data = require('some-module/package.json')`.

This module is basically only needed by npm, but it's handy to see what
npm will see when it looks at your package.

## Usage

```javascript
var readJson = require('read-package-json')

// readJson(filename, [logFunction=noop], [strict=false], cb)
readJson('/path/to/package.json', console.error, false, function (er, data) {
  if (er) {
    console.error("There was an error reading the file")
    return
  }

  console.error('the package data is', data)
});
```

## readJson(file, [logFn = noop], [strict = false], cb)

* `file` {String} The path to the package.json file
* `logFn` {Function} Function to handle logging.  Defaults to a noop.
* `strict` {Boolean} True to enforce SemVer 2.0 version strings, and
  other strict requirements.
* `cb` {Function} Gets called with `(er, data)`, as is The Node Way.

Reads the JSON file and does the things.

## `package.json` Fields

See `man 5 package.json` or `npm help json`.

## readJson.log

By default this is a reference to the `npmlog` module.  But if that
module can't be found, then it'll be set to just a dummy thing that does
nothing.

Replace with your own `{log,warn,error}` object for fun loggy time.

## readJson.extras(file, data, cb)

Run all the extra stuff relative to the file, with the parsed data.

Modifies the data as it does stuff.  Calls the cb when it's done.

## readJson.extraSet = [fn, fn, ...]

Array of functions that are called by `extras`.  Each one receives the
arguments `fn(file, data, cb)` and is expected to call `cb(er, data)`
when done or when an error occurs.

Order is indeterminate, so each function should be completely
independent.

Mix and match!

## Other Relevant Files Besides `package.json`

Some other files have an effect on the resulting data object, in the
following ways:

### `README?(.*)`

If there is a `README` or `README.*` file present, then npm will attach
a `readme` field to the data with the contents of this file.

Owing to the fact that roughly 100% of existing node modules have
Markdown README files, it will generally be assumed to be Markdown,
regardless of the extension.  Please plan accordingly.

### `server.js`

If there is a `server.js` file, and there is not already a
`scripts.start` field, then `scripts.start` will be set to `node
server.js`.

### `AUTHORS`

If there is not already a `contributors` field, then the `contributors`
field will be set to the contents of the `AUTHORS` file, split by lines,
and parsed.

### `bindings.gyp`

If a bindings.gyp file exists, and there is not already a
`scripts.install` field, then the `scripts.install` field will be set to
`node-gyp rebuild`.

### `index.js`

If the json file does not exist, but there is a `index.js` file
present instead, and that file has a package comment, then it will try
to parse the package comment, and use that as the data instead.

A package comment looks like this:

```javascript
/**package
 * { "name": "my-bare-module"
 * , "version": "1.2.3"
 * , "description": "etc...." }
 **/

// or...

/**package
{ "name": "my-bare-module"
, "version": "1.2.3"
, "description": "etc...." }
**/
```

The important thing is that it starts with `/**package`, and ends with
`**/`.  If the package.json file exists, then the index.js is not
parsed.

### `{directories.man}/*.[0-9]`

If there is not already a `man` field defined as an array of files or a
single file, and
there is a `directories.man` field defined, then that directory will
be searched for manpages.

Any valid manpages found in that directory will be assigned to the `man`
array, and installed in the appropriate man directory at package install
time, when installed globally on a Unix system.

### `{directories.bin}/*`

If there is not already a `bin` field defined as a string filename or a
hash of `<name> : <filename>` pairs, then the `directories.bin`
directory will be searched and all the files within it will be linked as
executables at install time.

When installing locally, npm links bins into `node_modules/.bin`, which
is in the `PATH` environ when npm runs scripts.  When
installing globally, they are linked into `{prefix}/bin`, which is
presumably in the `PATH` environment variable.
