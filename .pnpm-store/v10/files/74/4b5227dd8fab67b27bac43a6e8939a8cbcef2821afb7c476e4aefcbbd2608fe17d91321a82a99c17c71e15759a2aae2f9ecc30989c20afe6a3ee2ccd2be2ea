# @kwsites/file-exists

Synchronous validation of a path existing either as a file or as a directory.

```
const { exists, FILE, FOLDER, READABLE } = require('@kwsites/file-exists');

// check for a folder existing
assert(exists(__dirname, FOLDER));
assert(!exists(__filename, FOLDER));

// check for a file existing
assert(!exists(__filename, FILE));
assert(exists(__filename, FILE));

// when no type is specified, both folders and files are allowed
assert(exists(__dirname));
assert(exists(__filename));

// alternatively specify both files and folders
assert(exists(__dirname, FILE + FOLDER));

// or just that the path is readable (can be either a file or folder)
assert(exists(__filename, READABLE));
```

## Troubleshooting

This library uses [debug](https://www.npmjs.com/package/debug) to handle logging,
to enable logging, use either the environment variable:

```
"DEBUG=@kwsites/file-exists" node ./your-app.js 
``` 

Or explicitly enable logging using the `debug` library itself:

```javascript
require('debug').enable('@kwsites/file-exists');
``` 

