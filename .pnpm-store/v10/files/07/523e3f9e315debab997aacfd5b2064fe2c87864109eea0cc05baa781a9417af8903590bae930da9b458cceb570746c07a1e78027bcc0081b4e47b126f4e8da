# which

Like the unix `which` utility.

Finds the first instance of a specified executable in the PATH
environment variable.  Does not cache the results, so `hash -r` is not
needed when the PATH changes.

## USAGE

```javascript
const which = require('which')

// async usage
// rejects if not found
const resolved = await which('node')

// if nothrow option is used, returns null if not found
const resolvedOrNull = await which('node', { nothrow: true })

// sync usage
// throws if not found
const resolved = which.sync('node')

// if nothrow option is used, returns null if not found
const resolvedOrNull = which.sync('node', { nothrow: true })

// Pass options to override the PATH and PATHEXT environment vars.
await which('node', { path: someOtherPath, pathExt: somePathExt })
```

## CLI USAGE

Just like the BSD `which(1)` binary but using `node-which`.

```
usage: node-which [-as] program ...
```

You can learn more about why the binary is `node-which` and not `which` 
[here](https://github.com/npm/node-which/pull/67)

## OPTIONS

You may pass an options object as the second argument.

- `path`: Use instead of the `PATH` environment variable.
- `pathExt`: Use instead of the `PATHEXT` environment variable.
- `all`: Return all matches, instead of just the first one.  Note that
  this means the function returns an array of strings instead of a
  single string.
