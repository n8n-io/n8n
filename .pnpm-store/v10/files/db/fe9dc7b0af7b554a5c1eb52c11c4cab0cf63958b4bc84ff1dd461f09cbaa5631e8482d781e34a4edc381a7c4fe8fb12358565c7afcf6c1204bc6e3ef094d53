# infer-owner

Infer the owner of a path based on the owner of its nearest existing parent

## USAGE

```js
const inferOwner = require('infer-owner')

inferOwner('/some/cache/folder/file').then(owner => {
  // owner is {uid, gid} that should be attached to
  // the /some/cache/folder/file, based on ownership
  // of /some/cache/folder, /some/cache, /some, or /,
  // whichever is the first to exist
})

// same, but not async
const owner = inferOwner.sync('/some/cache/folder/file')

// results are cached!  to reset the cache (eg, to change
// permissions for whatever reason), do this:
inferOwner.clearCache()
```

This module endeavors to be as performant as possible.  Parallel requests
for ownership of the same path will only stat the directories one time.

## API

* `inferOwner(path) -> Promise<{ uid, gid }>`

    If the path exists, return its uid and gid.  If it does not, look to
    its parent, then its grandparent, and so on.

* `inferOwner(path) -> { uid, gid }`

    Sync form of `inferOwner(path)`.

* `inferOwner.clearCache()`

    Delete all cached ownership information and in-flight tracking.
