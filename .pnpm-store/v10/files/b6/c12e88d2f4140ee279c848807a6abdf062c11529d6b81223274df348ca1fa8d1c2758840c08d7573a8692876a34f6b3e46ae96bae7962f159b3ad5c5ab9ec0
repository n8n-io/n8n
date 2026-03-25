unique-filename
===============

Generate a unique filename for use in temporary directories or caches.

```
var uniqueFilename = require('unique-filename')

// returns something like: /tmp/912ec803b2ce49e4a541068d495ab570
var randomTmpfile = uniqueFilename(os.tmpdir())

// returns something like: /tmp/my-test-912ec803b2ce49e4a541068d495ab570
var randomPrefixedTmpfile = uniqueFilename(os.tmpdir(), 'my-test')

var uniqueTmpfile = uniqueFilename('/tmp', 'testing', '/my/thing/to/uniq/on')
```

### uniqueFilename(*dir*, *fileprefix*, *uniqstr*) → String

Returns the full path of a unique filename that looks like:
`dir/prefix-7ddd44c0`
or `dir/7ddd44c0`

*dir* – The path you want the filename in. `os.tmpdir()` is a good choice for this.

*fileprefix* – A string to append prior to the unique part of the filename.
The parameter is required if *uniqstr* is also passed in but is otherwise
optional and can be `undefined`/`null`/`''`. If present and not empty
then this string plus a hyphen are prepended to the unique part.

*uniqstr* – Optional, if not passed the unique part of the resulting
filename will be random.  If passed in it will be generated from this string
in a reproducable way.
