# cacache [![npm version](https://img.shields.io/npm/v/cacache.svg)](https://npm.im/cacache) [![license](https://img.shields.io/npm/l/cacache.svg)](https://npm.im/cacache) [![Travis](https://img.shields.io/travis/npm/cacache.svg)](https://travis-ci.org/npm/cacache) [![AppVeyor](https://ci.appveyor.com/api/projects/status/github/npm/cacache?svg=true)](https://ci.appveyor.com/project/npm/cacache) [![Coverage Status](https://coveralls.io/repos/github/npm/cacache/badge.svg?branch=latest)](https://coveralls.io/github/npm/cacache?branch=latest)

[`cacache`](https://github.com/npm/cacache) is a Node.js library for managing
local key and content address caches. It's really fast, really good at
concurrency, and it will never give you corrupted data, even if cache files
get corrupted or manipulated.

On systems that support user and group settings on files, cacache will
match the `uid` and `gid` values to the folder where the cache lives, even
when running as `root`.

It was written to be used as [npm](https://npm.im)'s local cache, but can
just as easily be used on its own.

## Install

`$ npm install --save cacache`

## Table of Contents

* [Example](#example)
* [Features](#features)
* [Contributing](#contributing)
* [API](#api)
  * [Using localized APIs](#localized-api)
  * Reading
    * [`ls`](#ls)
    * [`ls.stream`](#ls-stream)
    * [`get`](#get-data)
    * [`get.stream`](#get-stream)
    * [`get.info`](#get-info)
    * [`get.hasContent`](#get-hasContent)
  * Writing
    * [`put`](#put-data)
    * [`put.stream`](#put-stream)
    * [`rm.all`](#rm-all)
    * [`rm.entry`](#rm-entry)
    * [`rm.content`](#rm-content)
    * [`index.compact`](#index-compact)
    * [`index.insert`](#index-insert)
  * Utilities
    * [`clearMemoized`](#clear-memoized)
    * [`tmp.mkdir`](#tmp-mkdir)
    * [`tmp.withTmp`](#with-tmp)
  * Integrity
    * [Subresource Integrity](#integrity)
    * [`verify`](#verify)
    * [`verify.lastRun`](#verify-last-run)

### Example

```javascript
const cacache = require('cacache')
const fs = require('fs')

const tarball = '/path/to/mytar.tgz'
const cachePath = '/tmp/my-toy-cache'
const key = 'my-unique-key-1234'

// Cache it! Use `cachePath` as the root of the content cache
cacache.put(cachePath, key, '10293801983029384').then(integrity => {
  console.log(`Saved content to ${cachePath}.`)
})

const destination = '/tmp/mytar.tgz'

// Copy the contents out of the cache and into their destination!
// But this time, use stream instead!
cacache.get.stream(
  cachePath, key
).pipe(
  fs.createWriteStream(destination)
).on('finish', () => {
  console.log('done extracting!')
})

// The same thing, but skip the key index.
cacache.get.byDigest(cachePath, integrityHash).then(data => {
  fs.writeFile(destination, data, err => {
    console.log('tarball data fetched based on its sha512sum and written out!')
  })
})
```

### Features

* Extraction by key or by content address (shasum, etc)
* [Subresource Integrity](#integrity) web standard support
* Multi-hash support - safely host sha1, sha512, etc, in a single cache
* Automatic content deduplication
* Fault tolerance (immune to corruption, partial writes, process races, etc)
* Consistency guarantees on read and write (full data verification)
* Lockless, high-concurrency cache access
* Streaming support
* Promise support
* Fast -- sub-millisecond reads and writes including verification
* Arbitrary metadata storage
* Garbage collection and additional offline verification
* Thorough test coverage
* There's probably a bloom filter in there somewhere. Those are cool, right? 🤔

### Contributing

The cacache team enthusiastically welcomes contributions and project participation! There's a bunch of things you can do if you want to contribute! The [Contributor Guide](CONTRIBUTING.md) has all the information you need for everything from reporting bugs to contributing entire new features. Please don't hesitate to jump in if you'd like to, or even ask us questions if something isn't clear.

All participants and maintainers in this project are expected to follow [Code of Conduct](CODE_OF_CONDUCT.md), and just generally be excellent to each other.

Please refer to the [Changelog](CHANGELOG.md) for project history details, too.

Happy hacking!

### API

#### <a name="ls"></a> `> cacache.ls(cache) -> Promise<Object>`

Lists info for all entries currently in the cache as a single large object. Each
entry in the object will be keyed by the unique index key, with corresponding
[`get.info`](#get-info) objects as the values.

##### Example

```javascript
cacache.ls(cachePath).then(console.log)
// Output
{
  'my-thing': {
    key: 'my-thing',
    integrity: 'sha512-BaSe64/EnCoDED+HAsh=='
    path: '.testcache/content/deadbeef', // joined with `cachePath`
    time: 12345698490,
    size: 4023948,
    metadata: {
      name: 'blah',
      version: '1.2.3',
      description: 'this was once a package but now it is my-thing'
    }
  },
  'other-thing': {
    key: 'other-thing',
    integrity: 'sha1-ANothER+hasH=',
    path: '.testcache/content/bada55',
    time: 11992309289,
    size: 111112
  }
}
```

#### <a name="ls-stream"></a> `> cacache.ls.stream(cache) -> Readable`

Lists info for all entries currently in the cache as a single large object.

This works just like [`ls`](#ls), except [`get.info`](#get-info) entries are
returned as `'data'` events on the returned stream.

##### Example

```javascript
cacache.ls.stream(cachePath).on('data', console.log)
// Output
{
  key: 'my-thing',
  integrity: 'sha512-BaSe64HaSh',
  path: '.testcache/content/deadbeef', // joined with `cachePath`
  time: 12345698490,
  size: 13423,
  metadata: {
    name: 'blah',
    version: '1.2.3',
    description: 'this was once a package but now it is my-thing'
  }
}

{
  key: 'other-thing',
  integrity: 'whirlpool-WoWSoMuchSupport',
  path: '.testcache/content/bada55',
  time: 11992309289,
  size: 498023984029
}

{
  ...
}
```

#### <a name="get-data"></a> `> cacache.get(cache, key, [opts]) -> Promise({data, metadata, integrity})`

Returns an object with the cached data, digest, and metadata identified by
`key`. The `data` property of this object will be a `Buffer` instance that
presumably holds some data that means something to you. I'm sure you know what
to do with it! cacache just won't care.

`integrity` is a [Subresource
Integrity](#integrity)
string. That is, a string that can be used to verify `data`, which looks like
`<hash-algorithm>-<base64-integrity-hash>`.

If there is no content identified by `key`, or if the locally-stored data does
not pass the validity checksum, the promise will be rejected.

A sub-function, `get.byDigest` may be used for identical behavior, except lookup
will happen by integrity hash, bypassing the index entirely. This version of the
function *only* returns `data` itself, without any wrapper.

See: [options](#get-options)

##### Note

This function loads the entire cache entry into memory before returning it. If
you're dealing with Very Large data, consider using [`get.stream`](#get-stream)
instead.

##### Example

```javascript
// Look up by key
cache.get(cachePath, 'my-thing').then(console.log)
// Output:
{
  metadata: {
    thingName: 'my'
  },
  integrity: 'sha512-BaSe64HaSh',
  data: Buffer#<deadbeef>,
  size: 9320
}

// Look up by digest
cache.get.byDigest(cachePath, 'sha512-BaSe64HaSh').then(console.log)
// Output:
Buffer#<deadbeef>
```

#### <a name="get-stream"></a> `> cacache.get.stream(cache, key, [opts]) -> Readable`

Returns a [Readable Stream](https://nodejs.org/api/stream.html#stream_readable_streams) of the cached data identified by `key`.

If there is no content identified by `key`, or if the locally-stored data does
not pass the validity checksum, an error will be emitted.

`metadata` and `integrity` events will be emitted before the stream closes, if
you need to collect that extra data about the cached entry.

A sub-function, `get.stream.byDigest` may be used for identical behavior,
except lookup will happen by integrity hash, bypassing the index entirely. This
version does not emit the `metadata` and `integrity` events at all.

See: [options](#get-options)

##### Example

```javascript
// Look up by key
cache.get.stream(
  cachePath, 'my-thing'
).on('metadata', metadata => {
  console.log('metadata:', metadata)
}).on('integrity', integrity => {
  console.log('integrity:', integrity)
}).pipe(
  fs.createWriteStream('./x.tgz')
)
// Outputs:
metadata: { ... }
integrity: 'sha512-SoMeDIGest+64=='

// Look up by digest
cache.get.stream.byDigest(
  cachePath, 'sha512-SoMeDIGest+64=='
).pipe(
  fs.createWriteStream('./x.tgz')
)
```

#### <a name="get-info"></a> `> cacache.get.info(cache, key) -> Promise`

Looks up `key` in the cache index, returning information about the entry if
one exists.

##### Fields

* `key` - Key the entry was looked up under. Matches the `key` argument.
* `integrity` - [Subresource Integrity hash](#integrity) for the content this entry refers to.
* `path` - Filesystem path where content is stored, joined with `cache` argument.
* `time` - Timestamp the entry was first added on.
* `metadata` - User-assigned metadata associated with the entry/content.

##### Example

```javascript
cacache.get.info(cachePath, 'my-thing').then(console.log)

// Output
{
  key: 'my-thing',
  integrity: 'sha256-MUSTVERIFY+ALL/THINGS=='
  path: '.testcache/content/deadbeef',
  time: 12345698490,
  size: 849234,
  metadata: {
    name: 'blah',
    version: '1.2.3',
    description: 'this was once a package but now it is my-thing'
  }
}
```

#### <a name="get-hasContent"></a> `> cacache.get.hasContent(cache, integrity) -> Promise`

Looks up a [Subresource Integrity hash](#integrity) in the cache. If content
exists for this `integrity`, it will return an object, with the specific single integrity hash
that was found in `sri` key, and the size of the found content as `size`. If no content exists for this integrity, it will return `false`.

##### Example

```javascript
cacache.get.hasContent(cachePath, 'sha256-MUSTVERIFY+ALL/THINGS==').then(console.log)

// Output
{
  sri: {
    source: 'sha256-MUSTVERIFY+ALL/THINGS==',
    algorithm: 'sha256',
    digest: 'MUSTVERIFY+ALL/THINGS==',
    options: []
  },
  size: 9001
}

cacache.get.hasContent(cachePath, 'sha521-NOT+IN/CACHE==').then(console.log)

// Output
false
```

##### <a name="get-options"></a> Options

##### `opts.integrity`
If present, the pre-calculated digest for the inserted content. If this option
is provided and does not match the post-insertion digest, insertion will fail
with an `EINTEGRITY` error.

##### `opts.memoize`

Default: null

If explicitly truthy, cacache will read from memory and memoize data on bulk read. If `false`, cacache will read from disk data. Reader functions by default read from in-memory cache.

##### `opts.size`
If provided, the data stream will be verified to check that enough data was
passed through. If there's more or less data than expected, insertion will fail
with an `EBADSIZE` error.


#### <a name="put-data"></a> `> cacache.put(cache, key, data, [opts]) -> Promise`

Inserts data passed to it into the cache. The returned Promise resolves with a
digest (generated according to [`opts.algorithms`](#optsalgorithms)) after the
cache entry has been successfully written.

See: [options](#put-options)

##### Example

```javascript
fetch(
  'https://registry.npmjs.org/cacache/-/cacache-1.0.0.tgz'
).then(data => {
  return cacache.put(cachePath, 'registry.npmjs.org|cacache@1.0.0', data)
}).then(integrity => {
  console.log('integrity hash is', integrity)
})
```

#### <a name="put-stream"></a> `> cacache.put.stream(cache, key, [opts]) -> Writable`

Returns a [Writable
Stream](https://nodejs.org/api/stream.html#stream_writable_streams) that inserts
data written to it into the cache. Emits an `integrity` event with the digest of
written contents when it succeeds.

See: [options](#put-options)

##### Example

```javascript
request.get(
  'https://registry.npmjs.org/cacache/-/cacache-1.0.0.tgz'
).pipe(
  cacache.put.stream(
    cachePath, 'registry.npmjs.org|cacache@1.0.0'
  ).on('integrity', d => console.log(`integrity digest is ${d}`))
)
```

##### <a name="put-options"></a> Options

##### `opts.metadata`

Arbitrary metadata to be attached to the inserted key.

##### `opts.size`

If provided, the data stream will be verified to check that enough data was
passed through. If there's more or less data than expected, insertion will fail
with an `EBADSIZE` error.

##### `opts.integrity`

If present, the pre-calculated digest for the inserted content. If this option
is provided and does not match the post-insertion digest, insertion will fail
with an `EINTEGRITY` error.

`algorithms` has no effect if this option is present.

##### `opts.algorithms`

Default: ['sha512']

Hashing algorithms to use when calculating the [subresource integrity
digest](#integrity)
for inserted data. Can use any algorithm listed in `crypto.getHashes()` or
`'omakase'`/`'お任せします'` to pick a random hash algorithm on each insertion. You
may also use any anagram of `'modnar'` to use this feature.

Currently only supports one algorithm at a time (i.e., an array length of
exactly `1`). Has no effect if `opts.integrity` is present.

##### `opts.memoize`

Default: null

If provided, cacache will memoize the given cache insertion in memory, bypassing
any filesystem checks for that key or digest in future cache fetches. Nothing
will be written to the in-memory cache unless this option is explicitly truthy.

If `opts.memoize` is an object or a `Map`-like (that is, an object with `get`
and `set` methods), it will be written to instead of the global memoization
cache.

Reading from disk data can be forced by explicitly passing `memoize: false` to
the reader functions, but their default will be to read from memory.

##### `opts.tmpPrefix`
Default: null

Prefix to append on the temporary directory name inside the cache's tmp dir. 

#### <a name="rm-all"></a> `> cacache.rm.all(cache) -> Promise`

Clears the entire cache. Mainly by blowing away the cache directory itself.

##### Example

```javascript
cacache.rm.all(cachePath).then(() => {
  console.log('THE APOCALYPSE IS UPON US 😱')
})
```

#### <a name="rm-entry"></a> `> cacache.rm.entry(cache, key, [opts]) -> Promise`

Alias: `cacache.rm`

Removes the index entry for `key`. Content will still be accessible if
requested directly by content address ([`get.stream.byDigest`](#get-stream)).

By default, this appends a new entry to the index with an integrity of `null`.
If `opts.removeFully` is set to `true` then the index file itself will be
physically deleted rather than appending a `null`.

To remove the content itself (which might still be used by other entries), use
[`rm.content`](#rm-content). Or, to safely vacuum any unused content, use
[`verify`](#verify).

##### Example

```javascript
cacache.rm.entry(cachePath, 'my-thing').then(() => {
  console.log('I did not like it anyway')
})
```

#### <a name="rm-content"></a> `> cacache.rm.content(cache, integrity) -> Promise`

Removes the content identified by `integrity`. Any index entries referring to it
will not be usable again until the content is re-added to the cache with an
identical digest.

##### Example

```javascript
cacache.rm.content(cachePath, 'sha512-SoMeDIGest/IN+BaSE64==').then(() => {
  console.log('data for my-thing is gone!')
})
```

#### <a name="index-compact"></a> `> cacache.index.compact(cache, key, matchFn, [opts]) -> Promise`

Uses `matchFn`, which must be a synchronous function that accepts two entries
and returns a boolean indicating whether or not the two entries match, to
deduplicate all entries in the cache for the given `key`.

If `opts.validateEntry` is provided, it will be called as a function with the
only parameter being a single index entry. The function must return a Boolean,
if it returns `true` the entry is considered valid and will be kept in the index,
if it returns `false` the entry will be removed from the index.

If `opts.validateEntry` is not provided, however, every entry in the index will
be deduplicated and kept until the first `null` integrity is reached, removing
all entries that were written before the `null`.

The deduplicated list of entries is both written to the index, replacing the
existing content, and returned in the Promise.

#### <a name="index-insert"></a> `> cacache.index.insert(cache, key, integrity, opts) -> Promise`

Writes an index entry to the cache for the given `key` without writing content.

It is assumed if you are using this method, you have already stored the content
some other way and you only wish to add a new index to that content. The `metadata`
and `size` properties are read from `opts` and used as part of the index entry.

Returns a Promise resolving to the newly added entry.

#### <a name="clear-memoized"></a> `> cacache.clearMemoized()`

Completely resets the in-memory entry cache.

#### <a name="tmp-mkdir"></a> `> tmp.mkdir(cache, opts) -> Promise<Path>`

Returns a unique temporary directory inside the cache's `tmp` dir. This
directory will use the same safe user assignment that all the other stuff use.

Once the directory is made, it's the user's responsibility that all files
within are given the appropriate `gid`/`uid` ownership settings to match
the rest of the cache. If not, you can ask cacache to do it for you by
calling [`tmp.fix()`](#tmp-fix), which will fix all tmp directory
permissions.

If you want automatic cleanup of this directory, use
[`tmp.withTmp()`](#with-tpm)

See: [options](#tmp-options)

##### Example

```javascript
cacache.tmp.mkdir(cache).then(dir => {
  fs.writeFile(path.join(dir, 'blablabla'), Buffer#<1234>, ...)
})
```

#### <a name="tmp-fix"></a> `> tmp.fix(cache) -> Promise`

Sets the `uid` and `gid` properties on all files and folders within the tmp
folder to match the rest of the cache.

Use this after manually writing files into [`tmp.mkdir`](#tmp-mkdir) or
[`tmp.withTmp`](#with-tmp).

##### Example

```javascript
cacache.tmp.mkdir(cache).then(dir => {
  writeFile(path.join(dir, 'file'), someData).then(() => {
    // make sure we didn't just put a root-owned file in the cache
    cacache.tmp.fix().then(() => {
      // all uids and gids match now
    })
  })
})
```

#### <a name="with-tmp"></a> `> tmp.withTmp(cache, opts, cb) -> Promise`

Creates a temporary directory with [`tmp.mkdir()`](#tmp-mkdir) and calls `cb`
with it. The created temporary directory will be removed when the return value
of `cb()` resolves, the tmp directory will be automatically deleted once that 
promise completes.

The same caveats apply when it comes to managing permissions for the tmp dir's
contents.

See: [options](#tmp-options)

##### Example

```javascript
cacache.tmp.withTmp(cache, dir => {
  return fs.writeFileAsync(path.join(dir, 'blablabla'), Buffer#<1234>, ...)
}).then(() => {
  // `dir` no longer exists
})
```

##### <a name="tmp-options"></a> Options

##### `opts.tmpPrefix`
Default: null

Prefix to append on the temporary directory name inside the cache's tmp dir. 

#### <a name="integrity"></a> Subresource Integrity Digests

For content verification and addressing, cacache uses strings following the
[Subresource
Integrity spec](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity).
That is, any time cacache expects an `integrity` argument or option, it
should be in the format `<hashAlgorithm>-<base64-hash>`.

One deviation from the current spec is that cacache will support any hash
algorithms supported by the underlying Node.js process. You can use
`crypto.getHashes()` to see which ones you can use.

##### Generating Digests Yourself

If you have an existing content shasum, they are generally formatted as a
hexadecimal string (that is, a sha1 would look like:
`5f5513f8822fdbe5145af33b64d8d970dcf95c6e`). In order to be compatible with
cacache, you'll need to convert this to an equivalent subresource integrity
string. For this example, the corresponding hash would be:
`sha1-X1UT+IIv2+UUWvM7ZNjZcNz5XG4=`.

If you want to generate an integrity string yourself for existing data, you can
use something like this:

```javascript
const crypto = require('crypto')
const hashAlgorithm = 'sha512'
const data = 'foobarbaz'

const integrity = (
  hashAlgorithm +
  '-' +
  crypto.createHash(hashAlgorithm).update(data).digest('base64')
)
```

You can also use [`ssri`](https://npm.im/ssri) to have a richer set of functionality
around SRI strings, including generation, parsing, and translating from existing
hex-formatted strings.

#### <a name="verify"></a> `> cacache.verify(cache, opts) -> Promise`

Checks out and fixes up your cache:

* Cleans up corrupted or invalid index entries.
* Custom entry filtering options.
* Garbage collects any content entries not referenced by the index.
* Checks integrity for all content entries and removes invalid content.
* Fixes cache ownership.
* Removes the `tmp` directory in the cache and all its contents.

When it's done, it'll return an object with various stats about the verification
process, including amount of storage reclaimed, number of valid entries, number
of entries removed, etc.

##### <a name="verify-options"></a> Options

##### `opts.concurrency`

Default: 20

Number of concurrently read files in the filesystem while doing clean up.

##### `opts.filter`
Receives a formatted entry. Return false to remove it.
Note: might be called more than once on the same entry.

##### `opts.log`
Custom logger function:
```
  log: { silly () {} }
  log.silly('verify', 'verifying cache at', cache)
```

##### Example

```sh
echo somegarbage >> $CACHEPATH/content/deadbeef
```

```javascript
cacache.verify(cachePath).then(stats => {
  // deadbeef collected, because of invalid checksum.
  console.log('cache is much nicer now! stats:', stats)
})
```

#### <a name="verify-last-run"></a> `> cacache.verify.lastRun(cache) -> Promise`

Returns a `Date` representing the last time `cacache.verify` was run on `cache`.

##### Example

```javascript
cacache.verify(cachePath).then(() => {
  cacache.verify.lastRun(cachePath).then(lastTime => {
    console.log('cacache.verify was last called on' + lastTime)
  })
})
```
