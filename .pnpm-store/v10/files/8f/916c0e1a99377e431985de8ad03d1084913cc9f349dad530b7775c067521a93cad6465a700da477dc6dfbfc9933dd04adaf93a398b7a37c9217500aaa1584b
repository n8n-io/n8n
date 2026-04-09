# node-tar

Fast and full-featured Tar for Node.js

The API is designed to mimic the behavior of `tar(1)` on unix systems.
If you are familiar with how tar works, most of this will hopefully be
straightforward for you. If not, then hopefully this module can teach
you useful unix skills that may come in handy someday :)

## Security Information

Significant efforts have been taken to harden this library
against a wide variety of filesystem based attacks, especially as
it is used to unpack packages that are published by unknown
agents to [the npm registry](https://npmjs.com/).

A brief overview of some of the hardening that has gone into this
implementation. (Note that most of these are disabled if
`preservePaths: true` is set in the options.)

- Paths that attempt to walk up outside of the extraction target
  are ignored, and a warning is raised.
- `Link` and `SymbolicLink` entries are not allowed to target
  locations outside of the extraction folder.
- Extraction is not allowed through a symbolic link that appears
  within the extraction target.
- Absolute paths are turned into relative paths underneath the
  extraction target.
- Character Device, Block Device, and FIFO entries are never
  extracted.
- File and directory ownership is not mutated unless `forceChown`
  is set, or the extraction is run as root.
- File and directory modes in the archive are ignored, unless
  the `chmod: true` option is set.
- A path-reservation system is used to ensure that even when
  multiple entries are being extracted in parallel, subsequent
  entries with the same filename will not interfere with one
  another (for example, exchanging a file with a symbolic link
  while it is being written to).
- Unicode characters in path names are fully normalized, to
  prevent evading these protections with unicode equivalences.

It is frankly unlikely that any tar implementation in JavaScript
is going to be as secure as this one, unless a similar amount of
work is put into it, putting it to the test over many years of
intensive use and scrutiny. You can vibe-code a tar extractor in
an afternoon, but you'll regret it.

> [!WARNING]
>
> **However**, all that being said, _care must still be taken_
> when dealing with data from unknown sources, especially when
> extracting files, with this or any library, no matter how
> hardened it may be. It is _your_ responsibility to use this
> library safely.

1. **NEVER** extract tarball data into a folder that could be
   potentially controlled by an unknown actor. A clever attacker
   can swap out the target of an extracted file with a symbolic
   link to some location of their choosing, resulting in writing
   files outside the target folder. There is no reasonable way to
   harden against this category of attack, and security reports
   about it will be closed.
   [TOCTOU](https://cwe.mitre.org/data/definitions/367.html)
   exposure is unavoidable when creating files based on entries
   in an archive file.
2. If you are unpacking tarballs that may come from an unknown
   source, it is **highly recommended** that you use a filter
   function that rejects all hardlinks and symbolic links. Link
   files are historically the root of nearly every file
   extraction vulnerability. (npm filters links out of package
   artifacts for this reason.)
3. If you are extracting tarballs that are compressed (eg, with
   gzip, brotli, or zstd), then it is a very good idea to also
   filter out any files that are excessively large. Even if you
   are restricting the size of the archive file itself, an
   excessively large file of repetitive data can compress down
   very small, and extract to take up a lot of disk space.
4. **Stay up to date.** Old versions of tar are not maintained or
   tested for newly discovered security advisories, and should be
   assumed to contain every known security vulnerability, and
   many that are unknown.

If you find a security vulnerability in node-tar, where it is not
properly enforcing the intended security protections, then please
report it using the GitHub Security Advisories system, where it
will be triaged and corrected if possible.

## Background

A "tar file" or "tarball" is an archive of file system entries
(directories, files, links, etc.) The name comes from "tape archive".
If you run `man tar` on almost any Unix command line, you'll learn
quite a bit about what it can do, and its history.

Tar has 5 main top-level commands:

- `c` Create an archive
- `r` Replace entries within an archive
- `u` Update entries within an archive (ie, replace if they're newer)
- `t` List out the contents of an archive
- `x` Extract an archive to disk

The other flags and options modify how this top level function works.

## High-Level API

These 5 functions are the high-level API. All of them have a
single-character name (for unix nerds familiar with `tar(1)`) as well
as a long name (for everyone else).

All the high-level functions take the following arguments, all three
of which are optional and may be omitted.

1. `options` - An optional object specifying various options
2. `paths` - An array of paths to add or extract
3. `callback` - Called when the command is completed, if async. (If
   sync or no file specified, providing a callback throws a
   `TypeError`.)

If the command is sync (ie, if `options.sync=true`), then the
callback is not allowed, since the action will be completed immediately.

If a `file` argument is specified, and the command is async, then a
`Promise` is returned. In this case, if async, a callback may be
provided which is called when the command is completed.

If a `file` option is not specified, then a stream is returned. For
`create`, this is a readable stream of the generated archive. For
`list` and `extract` this is a writable stream that an archive should
be written into. If a file is not specified, then a callback is not
allowed, because you're already getting a stream to work with.

`replace` and `update` only work on existing archives, and so require
a `file` argument.

Sync commands without a file argument return a stream that acts on its
input immediately in the same tick. For readable streams, this means
that all of the data is immediately available by calling
`stream.read()`. For writable streams, it will be acted upon as soon
as it is provided, but this can be at any time.

### Warnings and Errors

Tar emits warnings and errors for recoverable and unrecoverable situations,
respectively. In many cases, a warning only affects a single entry in an
archive, or is simply informing you that it's modifying an entry to comply
with the settings provided.

Unrecoverable warnings will always raise an error (ie, emit `'error'` on
streaming actions, throw for non-streaming sync actions, reject the
returned Promise for non-streaming async operations, or call a provided
callback with an `Error` as the first argument). Recoverable errors will
raise an error only if `strict: true` is set in the options.

Respond to (recoverable) warnings by listening to the `warn` event.
Handlers receive 3 arguments:

- `code` String. One of the error codes below. This may not match
  `data.code`, which preserves the original error code from fs and zlib.
- `message` String. More details about the error.
- `data` Metadata about the error. An `Error` object for errors raised by
  fs and zlib. All fields are attached to errors raisd by tar. Typically
  contains the following fields, as relevant:
  - `tarCode` The tar error code.
  - `code` Either the tar error code, or the error code set by the
    underlying system.
  - `file` The archive file being read or written.
  - `cwd` Working directory for creation and extraction operations.
  - `entry` The entry object (if it could be created) for `TAR_ENTRY_INFO`,
    `TAR_ENTRY_INVALID`, and `TAR_ENTRY_ERROR` warnings.
  - `header` The header object (if it could be created, and the entry could
    not be created) for `TAR_ENTRY_INFO` and `TAR_ENTRY_INVALID` warnings.
  - `recoverable` Boolean. If `false`, then the warning will emit an
    `error`, even in non-strict mode.

#### Error Codes

- `TAR_ENTRY_INFO` An informative error indicating that an entry is being
  modified, but otherwise processed normally. For example, removing `/` or
  `C:\` from absolute paths if `preservePaths` is not set.

- `TAR_ENTRY_INVALID` An indication that a given entry is not a valid tar
  archive entry, and will be skipped. This occurs when:
  - a checksum fails,
  - a `linkpath` is missing for a link type, or
  - a `linkpath` is provided for a non-link type.

  If every entry in a parsed archive raises an `TAR_ENTRY_INVALID` error,
  then the archive is presumed to be unrecoverably broken, and
  `TAR_BAD_ARCHIVE` will be raised.

- `TAR_ENTRY_ERROR` The entry appears to be a valid tar archive entry, but
  encountered an error which prevented it from being unpacked. This occurs
  when:
  - an unrecoverable fs error happens during unpacking,
  - an entry is trying to extract into an excessively deep
    location (by default, limited to 1024 subfolders),
  - an entry has `..` in the path and `preservePaths` is not set, or
  - an entry is extracting through a symbolic link, when `preservePaths` is
    not set.

- `TAR_ENTRY_UNSUPPORTED` An indication that a given entry is
  a valid archive entry, but of a type that is unsupported, and so will be
  skipped in archive creation or extracting.

- `TAR_ABORT` When parsing gzipped-encoded archives, the parser will
  abort the parse process raise a warning for any zlib errors encountered.
  Aborts are considered unrecoverable for both parsing and unpacking.

- `TAR_BAD_ARCHIVE` The archive file is totally hosed. This can happen for
  a number of reasons, and always occurs at the end of a parse or extract:
  - An entry body was truncated before seeing the full number of bytes.
  - The archive contained only invalid entries, indicating that it is
    likely not an archive, or at least, not an archive this library can
    parse.

  `TAR_BAD_ARCHIVE` is considered informative for parse operations, but
  unrecoverable for extraction. Note that, if encountered at the end of an
  extraction, tar WILL still have extracted as much it could from the
  archive, so there may be some garbage files to clean up.

Errors that occur deeper in the system (ie, either the filesystem or zlib)
will have their error codes left intact, and a `tarCode` matching one of
the above will be added to the warning metadata or the raised error object.

Errors generated by tar will have one of the above codes set as the
`error.code` field as well, but since errors originating in zlib or fs will
have their original codes, it's better to read `error.tarCode` if you wish
to see how tar is handling the issue.

### Examples

The API mimics the `tar(1)` command line functionality, with aliases
for more human-readable option and function names. The goal is that
if you know how to use `tar(1)` in Unix, then you know how to use
`import('tar')` in JavaScript.

To replicate `tar czf my-tarball.tgz files and folders`, you'd do:

```js
import { create } from 'tar'
create(
  {
    gzip: <true|gzip options>,
    file: 'my-tarball.tgz'
  },
  ['some', 'files', 'and', 'folders']
).then(_ => { .. tarball has been created .. })
```

To replicate `tar cz files and folders > my-tarball.tgz`, you'd do:

```js
// if you're familiar with the tar(1) cli flags, this can be nice
import * as tar from 'tar'
tar.c(
  {
    // 'z' is alias for 'gzip' option
    z: <true|gzip options>
  },
  ['some', 'files', 'and', 'folders']
).pipe(fs.createWriteStream('my-tarball.tgz'))
```

To replicate `tar xf my-tarball.tgz` you'd do:

```js
tar.x( // or `tar.extract`
  {
    // or `file:`
    f: 'my-tarball.tgz'
  }
).then(_=> { .. tarball has been dumped in cwd .. })
```

To replicate `cat my-tarball.tgz | tar x -C some-dir --strip=1`:

```js
fs.createReadStream('my-tarball.tgz').pipe(
  tar.x({
    strip: 1,
    C: 'some-dir', // alias for cwd:'some-dir', also ok
  }),
)
```

To replicate `tar tf my-tarball.tgz`, do this:

```js
tar.t({
  file: 'my-tarball.tgz',
  onReadEntry: entry => { .. do whatever with it .. }
})
```

For example, to just get the list of filenames from an archive:

```js
const getEntryFilenames = async tarballFilename => {
  const filenames = []
  await tar.t({
    file: tarballFilename,
    onReadEntry: entry => filenames.push(entry.path),
  })
  return filenames
}
```

To replicate `cat my-tarball.tgz | tar t` do:

```js
fs.createReadStream('my-tarball.tgz')
  .pipe(tar.t())
  .on('entry', entry => { .. do whatever with it .. })
```

To do anything synchronous, add `sync: true` to the options. Note
that sync functions don't take a callback and don't return a promise.
When the function returns, it's already done. Sync methods without a
file argument return a sync stream, which flushes immediately. But,
of course, it still won't be done until you `.end()` it.

```js
const getEntryFilenamesSync = tarballFilename => {
  const filenames = []
  tar.t({
    file: tarballFilename,
    onReadEntry: entry => filenames.push(entry.path),
    sync: true,
  })
  return filenames
}
```

To filter entries, add `filter: <function>` to the options.
Tar-creating methods call the filter with `filter(path, stat)`.
Tar-reading methods (including extraction) call the filter with
`filter(path, entry)`. The filter is called in the `this`-context of
the `Pack` or `Unpack` stream object.

The arguments list to `tar t` and `tar x` specify a list of filenames
to extract or list, so they're equivalent to a filter that tests if
the file is in the list.

For those who _aren't_ fans of tar's single-character command names:

```
tar.c === tar.create
tar.r === tar.replace (appends to archive, file is required)
tar.u === tar.update (appends if newer, file is required)
tar.x === tar.extract
tar.t === tar.list
```

Keep reading for all the command descriptions and options, as well as
the low-level API that they are built on.

### tar.c(options, fileList, callback) [alias: tar.create]

Create a tarball archive.

The `fileList` is an array of paths to add to the tarball. Adding a
directory also adds its children recursively.

An entry in `fileList` that starts with an `@` symbol is a tar archive
whose entries will be added. To add a file that starts with `@`,
prepend it with `./`.

The following options are supported:

- `file` Write the tarball archive to the specified filename. If this
  is specified, then the callback will be fired when the file has been
  written, and a promise will be returned that resolves when the file
  is written. If a filename is not specified, then a Readable Stream
  will be returned which will emit the file data. [Alias: `f`]
- `sync` Act synchronously. If this is set, then any provided file
  will be fully written after the call to `tar.c`. If this is set,
  and a file is not provided, then the resulting stream will already
  have the data ready to `read` or `emit('data')` as soon as you
  request it.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")
- `strict` Treat warnings as crash-worthy errors. Default false.
- `cwd` The current working directory for creating the archive.
  Defaults to `process.cwd()`. [Alias: `C`]
- `prefix` A path portion to prefix onto the entries in the archive.
- `gzip` Set to any truthy value to create a gzipped archive, or an
  object with settings for `zlib.Gzip()` [Alias: `z`]
- `filter` A function that gets called with `(path, stat)` for each
  entry being added. Return `true` to add the entry to the archive,
  or `false` to omit it.
- `portable` Omit metadata that is system-specific: `ctime`, `atime`,
  `uid`, `gid`, `uname`, `gname`, `dev`, `ino`, and `nlink`. Note
  that `mtime` is still included, because this is necessary for other
  time-based operations. Additionally, `mode` is set to a "reasonable
  default" for most unix systems, based on a `umask` value of `0o22`.
- `preservePaths` Allow absolute paths. By default, `/` is stripped
  from absolute paths. [Alias: `P`]
- `mode` The mode to set on the created file archive
- `noDirRecurse` Do not recursively archive the contents of
  directories. [Alias: `n`]
- `follow` Set to true to pack the targets of symbolic links. Without
  this option, symbolic links are archived as such. [Alias: `L`, `h`]
- `noPax` Suppress pax extended headers. Note that this means that
  long paths and linkpaths will be truncated, and large or negative
  numeric values may be interpreted incorrectly.
- `noMtime` Set to true to omit writing `mtime` values for entries.
  Note that this prevents using other mtime-based features like
  `tar.update` or the `keepNewer` option with the resulting tar archive.
  [Alias: `m`, `no-mtime`]
- `mtime` Set to a `Date` object to force a specific `mtime` for
  everything added to the archive. Overridden by `noMtime`.
- `onWriteEntry` Called with each `WriteEntry` or
  `WriteEntrySync` that is created in the course of writing the
  archive.

The following options are mostly internal, but can be modified in some
advanced use cases, such as re-using caches between runs.

- `linkCache` A Map object containing the device and inode value for
  any file whose nlink is > 1, to identify hard links.
- `statCache` A Map object that caches calls `lstat`.
- `readdirCache` A Map object that caches calls to `readdir`.
- `jobs` A number specifying how many concurrent jobs to run.
  Defaults to 4.
- `maxReadSize` The maximum buffer size for `fs.read()` operations.
  Defaults to 16 MB.

#### Using `onWriteEntry` to alter entries

The `onWriteEntry` function, if provided, will get a reference
to each `entry` object on its way into the archive.

If any fields on this entry are changed, then these changes will
be reflected in the entry that is written to the archive.

The return value of the function is ignored. All that matters is
the final state of the entry object. This can also be used to
track the files added to an archive, for example.

```js
import * as tar from 'tar'
const filesAdded = []
tar.c(
  {
    sync: true,
    file: 'lowercase-executable.tar',
    onWriteEntry(entry) {
      // initially, it's uppercase and 0o644
      console.log('adding', entry.path, entry.stat.mode.toString(8))
      // make all the paths lowercase
      entry.path = entry.path.toLowerCase()
      // make the entry executable
      entry.stat.mode = 0o755
      // in the archive, it's lowercase and 0o755
      filesAdded.push([entry.path, entry.stat.mode.toString(8)])
    },
  },
  ['./bin'],
)
console.log('added', filesAdded)
```

Then, if the `./bin` directory contained `SOME-BIN`, it would
show up in the archive as:

```
$ node create-lowercase-executable.js
adding ./bin/SOME-BIN 644
added [[ './bin/some-bin', '755' ]]

$ tar cvf lowercase-executable.tar
-rwxr-xr-x  0 isaacs 20      47731 Aug 14 08:56 ./bin/some-bin
```

with a lowercase name and a mode of `0o755`.

### tar.x(options, fileList, callback) [alias: tar.extract]

Extract a tarball archive.

The `fileList` is an array of paths to extract from the tarball. If
no paths are provided, then all the entries are extracted.

If the archive is gzipped, then tar will detect this and unzip it.

Note that all directories that are created will be forced to be
writable, readable, and listable by their owner, to avoid cases where
a directory prevents extraction of child entries by virtue of its
mode.

Most extraction errors will cause a `warn` event to be emitted. If
the `cwd` is missing, or not a directory, then the extraction will
fail completely.

The following options are supported:

- `cwd` Extract files relative to the specified directory. Defaults
  to `process.cwd()`. If provided, this must exist and must be a
  directory. [Alias: `C`]
- `file` The archive file to extract. If not specified, then a
  Writable stream is returned where the archive data should be
  written. [Alias: `f`]
- `sync` Create files and directories synchronously.
- `strict` Treat warnings as crash-worthy errors. Default false.
- `filter` A function that gets called with `(path, entry)` for each
  entry being unpacked. Return `true` to unpack the entry from the
  archive, or `false` to skip it.
- `newer` Set to true to keep the existing file on disk if it's newer
  than the file in the archive. [Alias: `keep-newer`,
  `keep-newer-files`]
- `keep` Do not overwrite existing files. In particular, if a file
  appears more than once in an archive, later copies will not
  overwrite earlier copies. [Alias: `k`, `keep-existing`]
- `preservePaths` Allow absolute paths, paths containing `..`, and
  extracting through symbolic links. By default, `/` is stripped from
  absolute paths, `..` paths are not extracted, and any file whose
  location would be modified by a symbolic link is not extracted.
  [Alias: `P`]
- `unlink` Unlink files before creating them. Without this option,
  tar overwrites existing files, which preserves existing hardlinks.
  With this option, existing hardlinks will be broken, as will any
  symlink that would affect the location of an extracted file. [Alias:
  `U`]
- `strip` Remove the specified number of leading path elements.
  Pathnames with fewer elements will be silently skipped. Note that
  the pathname is edited after applying the filter, but before
  security checks. [Alias: `strip-components`, `stripComponents`]
- `preserveOwner` If true, tar will set the `uid` and `gid` of
  extracted entries to the `uid` and `gid` fields in the archive.
  This defaults to true when run as root, and false otherwise. If
  false, then files and directories will be set with the owner and
  group of the user running the process. This is similar to `-p` in
  `tar(1)`, but ACLs and other system-specific data is never unpacked
  in this implementation, and modes are set by default already.
  [Alias: `p`]
- `uid` Set to a number to force ownership of all extracted files and
  folders, and all implicitly created directories, to be owned by the
  specified user id, regardless of the `uid` field in the archive.
  Cannot be used along with `preserveOwner`. Requires also setting a
  `gid` option.
- `gid` Set to a number to force ownership of all extracted files and
  folders, and all implicitly created directories, to be owned by the
  specified group id, regardless of the `gid` field in the archive.
  Cannot be used along with `preserveOwner`. Requires also setting a
  `uid` option.
- `noMtime` Set to true to omit writing `mtime` value for extracted
  entries. [Alias: `m`, `no-mtime`]
- `transform` Provide a function that takes an `entry` object, and
  returns a stream, or any falsey value. If a stream is provided,
  then that stream's data will be written instead of the contents of
  the archive entry. If a falsey value is provided, then the entry is
  written to disk as normal. (To exclude items from extraction, use
  the `filter` option described above.)
- `onReadEntry` A function that gets called with `(entry)` for each entry
  that passes the filter.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")
- `chmod` Set to true to call `fs.chmod()` to ensure that the
  extracted file matches the entry mode. This may necessitate a
  call to the deprecated and thread-unsafe `process.umask()`
  method to determine the default umask value, unless a
  `processUmask` options is also provided. Otherwise tar will
  extract with whatever mode is provided, and let the process
  `umask` apply normally.
- `processUmask` Set to an explicit numeric value to avoid
  calling `process.umask()` when `chmod: true` is set.
- `maxDepth` The maximum depth of subfolders to extract into. This
  defaults to 1024. Anything deeper than the limit will raise a
  warning and skip the entry. Set to `Infinity` to remove the
  limitation.

The following options are mostly internal, but can be modified in some
advanced use cases, such as re-using caches between runs.

- `maxReadSize` The maximum buffer size for `fs.read()` operations.
  Defaults to 16 MB.
- `umask` Filter the modes of entries like `process.umask()`.
- `dmode` Default mode for directories
- `fmode` Default mode for files
- `maxMetaEntrySize` The maximum size of meta entries that is
  supported. Defaults to 1 MB.

Note that using an asynchronous stream type with the `transform`
option will cause undefined behavior in sync extractions.
[MiniPass](http://npm.im/minipass)-based streams are designed for this
use case.

### tar.t(options, fileList, callback) [alias: tar.list]

List the contents of a tarball archive.

The `fileList` is an array of paths to list from the tarball. If
no paths are provided, then all the entries are listed.

If the archive is gzipped, then tar will detect this and unzip it.

If the `file` option is _not_ provided, then returns an event emitter that
emits `entry` events with `tar.ReadEntry` objects. However, they don't
emit `'data'` or `'end'` events. (If you want to get actual readable
entries, use the `tar.Parser` class instead.)

If a `file` option _is_ provided, then the return value will be a promise
that resolves when the file has been fully traversed in async mode, or
`undefined` if `sync: true` is set. Thus, you _must_ specify an `onReadEntry`
method in order to do anything useful with the data it parses.

The following options are supported:

- `file` The archive file to list. If not specified, then a
  Writable stream is returned where the archive data should be
  written. [Alias: `f`]
- `sync` Read the specified file synchronously. (This has no effect
  when a file option isn't specified, because entries are emitted as
  fast as they are parsed from the stream anyway.)
- `strict` Treat warnings as crash-worthy errors. Default false.
- `filter` A function that gets called with `(path, entry)` for each
  entry being listed. Return `true` to emit the entry from the
  archive, or `false` to skip it.
- `onReadEntry` A function that gets called with `(entry)` for each entry
  that passes the filter. This is important for when `file` is set,
  because there is no other way to do anything useful with this method.
- `maxReadSize` The maximum buffer size for `fs.read()` operations.
  Defaults to 16 MB.
- `noResume` By default, `entry` streams are resumed immediately after
  the call to `onReadEntry`. Set `noResume: true` to suppress this
  behavior. Note that by opting into this, the stream will never
  complete until the entry data is consumed.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")

### tar.u(options, fileList, callback) [alias: tar.update]

Add files to an archive if they are newer than the entry already in
the tarball archive.

The `fileList` is an array of paths to add to the tarball. Adding a
directory also adds its children recursively.

An entry in `fileList` that starts with an `@` symbol is a tar archive
whose entries will be added. To add a file that starts with `@`,
prepend it with `./`.

The following options are supported:

- `file` Required. Write the tarball archive to the specified
  filename. [Alias: `f`]
- `sync` Act synchronously. If this is set, then any provided file
  will be fully written after the call to `tar.c`.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")
- `strict` Treat warnings as crash-worthy errors. Default false.
- `cwd` The current working directory for adding entries to the
  archive. Defaults to `process.cwd()`. [Alias: `C`]
- `prefix` A path portion to prefix onto the entries in the archive.
- `gzip` Set to any truthy value to create a gzipped archive, or an
  object with settings for `zlib.Gzip()` [Alias: `z`]
- `filter` A function that gets called with `(path, stat)` for each
  entry being added. Return `true` to add the entry to the archive,
  or `false` to omit it.
- `portable` Omit metadata that is system-specific: `ctime`, `atime`,
  `uid`, `gid`, `uname`, `gname`, `dev`, `ino`, and `nlink`. Note
  that `mtime` is still included, because this is necessary for other
  time-based operations. Additionally, `mode` is set to a "reasonable
  default" for most unix systems, based on a `umask` value of `0o22`.
- `preservePaths` Allow absolute paths. By default, `/` is stripped
  from absolute paths. [Alias: `P`]
- `maxReadSize` The maximum buffer size for `fs.read()` operations.
  Defaults to 16 MB.
- `noDirRecurse` Do not recursively archive the contents of
  directories. [Alias: `n`]
- `follow` Set to true to pack the targets of symbolic links. Without
  this option, symbolic links are archived as such. [Alias: `L`, `h`]
- `noPax` Suppress pax extended headers. Note that this means that
  long paths and linkpaths will be truncated, and large or negative
  numeric values may be interpreted incorrectly.
- `noMtime` Set to true to omit writing `mtime` values for entries.
  Note that this prevents using other mtime-based features like
  `tar.update` or the `keepNewer` option with the resulting tar archive.
  [Alias: `m`, `no-mtime`]
- `mtime` Set to a `Date` object to force a specific `mtime` for
  everything added to the archive. Overridden by `noMtime`.
- `onWriteEntry` Called with each `WriteEntry` or
  `WriteEntrySync` that is created in the course of writing the
  archive.

### tar.r(options, fileList, callback) [alias: tar.replace]

Add files to an existing archive. Because later entries override
earlier entries, this effectively replaces any existing entries.

The `fileList` is an array of paths to add to the tarball. Adding a
directory also adds its children recursively.

An entry in `fileList` that starts with an `@` symbol is a tar archive
whose entries will be added. To add a file that starts with `@`,
prepend it with `./`.

The following options are supported:

- `file` Required. Write the tarball archive to the specified
  filename. [Alias: `f`]
- `sync` Act synchronously. If this is set, then any provided file
  will be fully written after the call to `tar.c`.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")
- `strict` Treat warnings as crash-worthy errors. Default false.
- `cwd` The current working directory for adding entries to the
  archive. Defaults to `process.cwd()`. [Alias: `C`]
- `prefix` A path portion to prefix onto the entries in the archive.
- `gzip` Set to any truthy value to create a gzipped archive, or an
  object with settings for `zlib.Gzip()` [Alias: `z`]
- `filter` A function that gets called with `(path, stat)` for each
  entry being added. Return `true` to add the entry to the archive,
  or `false` to omit it.
- `portable` Omit metadata that is system-specific: `ctime`, `atime`,
  `uid`, `gid`, `uname`, `gname`, `dev`, `ino`, and `nlink`. Note
  that `mtime` is still included, because this is necessary for other
  time-based operations. Additionally, `mode` is set to a "reasonable
  default" for most unix systems, based on a `umask` value of `0o22`.
- `preservePaths` Allow absolute paths. By default, `/` is stripped
  from absolute paths. [Alias: `P`]
- `maxReadSize` The maximum buffer size for `fs.read()` operations.
  Defaults to 16 MB.
- `noDirRecurse` Do not recursively archive the contents of
  directories. [Alias: `n`]
- `follow` Set to true to pack the targets of symbolic links. Without
  this option, symbolic links are archived as such. [Alias: `L`, `h`]
- `noPax` Suppress pax extended headers. Note that this means that
  long paths and linkpaths will be truncated, and large or negative
  numeric values may be interpreted incorrectly.
- `noMtime` Set to true to omit writing `mtime` values for entries.
  Note that this prevents using other mtime-based features like
  `tar.update` or the `keepNewer` option with the resulting tar archive.
  [Alias: `m`, `no-mtime`]
- `mtime` Set to a `Date` object to force a specific `mtime` for
  everything added to the archive. Overridden by `noMtime`.
- `onWriteEntry` Called with each `WriteEntry` or
  `WriteEntrySync` that is created in the course of writing the
  archive.

## Low-Level API

### class Pack

A readable tar stream.

Has all the standard readable stream interface stuff. `'data'` and
`'end'` events, `read()` method, `pause()` and `resume()`, etc.

#### constructor(options)

The following options are supported:

- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")
- `strict` Treat warnings as crash-worthy errors. Default false.
- `cwd` The current working directory for creating the archive.
  Defaults to `process.cwd()`.
- `prefix` A path portion to prefix onto the entries in the archive.
- `gzip` Set to any truthy value to create a gzipped archive, or an
  object with settings for `zlib.Gzip()`
- `filter` A function that gets called with `(path, stat)` for each
  entry being added. Return `true` to add the entry to the archive,
  or `false` to omit it.
- `portable` Omit metadata that is system-specific: `ctime`, `atime`,
  `uid`, `gid`, `uname`, `gname`, `dev`, `ino`, and `nlink`. Note
  that `mtime` is still included, because this is necessary for other
  time-based operations. Additionally, `mode` is set to a "reasonable
  default" for most unix systems, based on a `umask` value of `0o22`.
- `preservePaths` Allow absolute paths. By default, `/` is stripped
  from absolute paths.
- `linkCache` A Map object containing the device and inode value for
  any file whose nlink is > 1, to identify hard links.
- `statCache` A Map object that caches calls `lstat`.
- `readdirCache` A Map object that caches calls to `readdir`.
- `jobs` A number specifying how many concurrent jobs to run.
  Defaults to 4.
- `maxReadSize` The maximum buffer size for `fs.read()` operations.
  Defaults to 16 MB.
- `noDirRecurse` Do not recursively archive the contents of
  directories.
- `follow` Set to true to pack the targets of symbolic links. Without
  this option, symbolic links are archived as such.
- `noPax` Suppress pax extended headers. Note that this means that
  long paths and linkpaths will be truncated, and large or negative
  numeric values may be interpreted incorrectly.
- `noMtime` Set to true to omit writing `mtime` values for entries.
  Note that this prevents using other mtime-based features like
  `tar.update` or the `keepNewer` option with the resulting tar archive.
- `mtime` Set to a `Date` object to force a specific `mtime` for
  everything added to the archive. Overridden by `noMtime`.
- `onWriteEntry` Called with each `WriteEntry` or
  `WriteEntrySync` that is created in the course of writing the
  archive.

#### add(path)

Adds an entry to the archive. Returns the Pack stream.

#### write(path)

Adds an entry to the archive. Returns true if flushed.

#### end()

Finishes the archive.

### class PackSync

Synchronous version of `Pack`.

### class Unpack

A writable stream that unpacks a tar archive onto the file system.

All the normal writable stream stuff is supported. `write()` and
`end()` methods, `'drain'` events, etc.

Note that all directories that are created will be forced to be
writable, readable, and listable by their owner, to avoid cases where
a directory prevents extraction of child entries by virtue of its
mode.

`'close'` is emitted when it's done writing stuff to the file system.

Most unpack errors will cause a `warn` event to be emitted. If the
`cwd` is missing, or not a directory, then an error will be emitted.

#### constructor(options)

- `cwd` Extract files relative to the specified directory. Defaults
  to `process.cwd()`. If provided, this must exist and must be a
  directory.
- `filter` A function that gets called with `(path, entry)` for each
  entry being unpacked. Return `true` to unpack the entry from the
  archive, or `false` to skip it.
- `newer` Set to true to keep the existing file on disk if it's newer
  than the file in the archive.
- `keep` Do not overwrite existing files. In particular, if a file
  appears more than once in an archive, later copies will not
  overwrite earlier copies.
- `preservePaths` Allow absolute paths, paths containing `..`, and
  extracting through symbolic links. By default, `/` is stripped from
  absolute paths, `..` paths are not extracted, and any file whose
  location would be modified by a symbolic link is not extracted.
- `unlink` Unlink files before creating them. Without this option,
  tar overwrites existing files, which preserves existing hardlinks.
  With this option, existing hardlinks will be broken, as will any
  symlink that would affect the location of an extracted file.
- `strip` Remove the specified number of leading path elements.
  Pathnames with fewer elements will be silently skipped. Note that
  the pathname is edited after applying the filter, but before
  security checks.
- `umask` Filter the modes of entries like `process.umask()`.
- `dmode` Default mode for directories
- `fmode` Default mode for files
- `maxMetaEntrySize` The maximum size of meta entries that is
  supported. Defaults to 1 MB.
- `preserveOwner` If true, tar will set the `uid` and `gid` of
  extracted entries to the `uid` and `gid` fields in the archive.
  This defaults to true when run as root, and false otherwise. If
  false, then files and directories will be set with the owner and
  group of the user running the process. This is similar to `-p` in
  `tar(1)`, but ACLs and other system-specific data is never unpacked
  in this implementation, and modes are set by default already.
- `win32` True if on a windows platform. Causes behavior where
  filenames containing `<|>?` chars are converted to
  windows-compatible values while being unpacked.
- `uid` Set to a number to force ownership of all extracted files and
  folders, and all implicitly created directories, to be owned by the
  specified user id, regardless of the `uid` field in the archive.
  Cannot be used along with `preserveOwner`. Requires also setting a
  `gid` option.
- `gid` Set to a number to force ownership of all extracted files and
  folders, and all implicitly created directories, to be owned by the
  specified group id, regardless of the `gid` field in the archive.
  Cannot be used along with `preserveOwner`. Requires also setting a
  `uid` option.
- `noMtime` Set to true to omit writing `mtime` value for extracted
  entries.
- `transform` Provide a function that takes an `entry` object, and
  returns a stream, or any falsey value. If a stream is provided,
  then that stream's data will be written instead of the contents of
  the archive entry. If a falsey value is provided, then the entry is
  written to disk as normal. (To exclude items from extraction, use
  the `filter` option described above.)
- `strict` Treat warnings as crash-worthy errors. Default false.
- `onReadEntry` A function that gets called with `(entry)` for each entry
  that passes the filter.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")
- `chmod` Set to true to call `fs.chmod()` to ensure that the
  extracted file matches the entry mode. This may necessitate a
  call to the deprecated and thread-unsafe `process.umask()`
  method to determine the default umask value, unless a
  `processUmask` options is also provided. Otherwise tar will
  extract with whatever mode is provided, and let the process
  `umask` apply normally.
- `processUmask` Set to an explicit numeric value to avoid
  calling `process.umask()` when `chmod: true` is set.
- `maxDepth` The maximum depth of subfolders to extract into. This
  defaults to 1024. Anything deeper than the limit will raise a
  warning and skip the entry. Set to `Infinity` to remove the
  limitation.

### class UnpackSync

Synchronous version of `Unpack`.

Note that using an asynchronous stream type with the `transform`
option will cause undefined behavior in sync unpack streams.
[MiniPass](http://npm.im/minipass)-based streams are designed for this
use case.

### class tar.Parser

A writable stream that parses a tar archive stream. All the standard
writable stream stuff is supported.

If the archive is gzipped, then tar will detect this and unzip it.

Emits `'entry'` events with `tar.ReadEntry` objects, which are
themselves readable streams that you can pipe wherever.

Each `entry` will not emit until the one before it is flushed through,
so make sure to either consume the data (with `on('data', ...)` or
`.pipe(...)`) or throw it away with `.resume()` to keep the stream
flowing.

#### constructor(options)

Returns an event emitter that emits `entry` events with
`tar.ReadEntry` objects.

The following options are supported:

- `strict` Treat warnings as crash-worthy errors. Default false.
- `filter` A function that gets called with `(path, entry)` for each
  entry being listed. Return `true` to emit the entry from the
  archive, or `false` to skip it.
- `onReadEntry` A function that gets called with `(entry)` for each entry
  that passes the filter.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")

#### abort(error)

Stop all parsing activities. This is called when there are zlib
errors. It also emits an unrecoverable warning with the error provided.

### class tar.ReadEntry extends [MiniPass](http://npm.im/minipass)

A representation of an entry that is being read out of a tar archive.

It has the following fields:

- `extended` The extended metadata object provided to the constructor.
- `globalExtended` The global extended metadata object provided to the
  constructor.
- `remain` The number of bytes remaining to be written into the
  stream.
- `blockRemain` The number of 512-byte blocks remaining to be written
  into the stream.
- `ignore` Whether this entry should be ignored.
- `meta` True if this represents metadata about the next entry, false
  if it represents a filesystem object.
- All the fields from the header, extended header, and global extended
  header are added to the ReadEntry object. So it has `path`, `type`,
  `size`, `mode`, and so on.

#### constructor(header, extended, globalExtended)

Create a new ReadEntry object with the specified header, extended
header, and global extended header values.

### class tar.WriteEntry extends [MiniPass](http://npm.im/minipass)

A representation of an entry that is being written from the file
system into a tar archive.

Emits data for the Header, and for the Pax Extended Header if one is
required, as well as any body data.

Creating a WriteEntry for a directory does not also create
WriteEntry objects for all of the directory contents.

It has the following fields:

- `path` The path field that will be written to the archive. By
  default, this is also the path from the cwd to the file system
  object.
- `portable` Omit metadata that is system-specific: `ctime`, `atime`,
  `uid`, `gid`, `uname`, `gname`, `dev`, `ino`, and `nlink`. Note
  that `mtime` is still included, because this is necessary for other
  time-based operations. Additionally, `mode` is set to a "reasonable
  default" for most unix systems, based on a `umask` value of `0o22`.
- `myuid` If supported, the uid of the user running the current
  process.
- `myuser` The `env.USER` string if set, or `''`. Set as the entry
  `uname` field if the file's `uid` matches `this.myuid`.
- `maxReadSize` The maximum buffer size for `fs.read()` operations.
  Defaults to 1 MB.
- `linkCache` A Map object containing the device and inode value for
  any file whose nlink is > 1, to identify hard links.
- `statCache` A Map object that caches calls `lstat`.
- `preservePaths` Allow absolute paths. By default, `/` is stripped
  from absolute paths.
- `cwd` The current working directory for creating the archive.
  Defaults to `process.cwd()`.
- `absolute` The absolute path to the entry on the filesystem. By
  default, this is `path.resolve(this.cwd, this.path)`, but it can be
  overridden explicitly.
- `strict` Treat warnings as crash-worthy errors. Default false.
- `win32` True if on a windows platform. Causes behavior where paths
  replace `\` with `/` and filenames containing the windows-compatible
  forms of `<|>?:` characters are converted to actual `<|>?:` characters
  in the archive.
- `noPax` Suppress pax extended headers. Note that this means that
  long paths and linkpaths will be truncated, and large or negative
  numeric values may be interpreted incorrectly.
- `noMtime` Set to true to omit writing `mtime` values for entries.
  Note that this prevents using other mtime-based features like
  `tar.update` or the `keepNewer` option with the resulting tar archive.

#### constructor(path, options)

`path` is the path of the entry as it is written in the archive.

The following options are supported:

- `portable` Omit metadata that is system-specific: `ctime`, `atime`,
  `uid`, `gid`, `uname`, `gname`, `dev`, `ino`, and `nlink`. Note
  that `mtime` is still included, because this is necessary for other
  time-based operations. Additionally, `mode` is set to a "reasonable
  default" for most unix systems, based on a `umask` value of `0o22`.
- `maxReadSize` The maximum buffer size for `fs.read()` operations.
  Defaults to 1 MB.
- `linkCache` A Map object containing the device and inode value for
  any file whose nlink is > 1, to identify hard links.
- `statCache` A Map object that caches calls `lstat`.
- `preservePaths` Allow absolute paths. By default, `/` is stripped
  from absolute paths.
- `cwd` The current working directory for creating the archive.
  Defaults to `process.cwd()`.
- `absolute` The absolute path to the entry on the filesystem. By
  default, this is `path.resolve(this.cwd, this.path)`, but it can be
  overridden explicitly.
- `strict` Treat warnings as crash-worthy errors. Default false.
- `win32` True if on a windows platform. Causes behavior where paths
  replace `\` with `/`.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")
- `noMtime` Set to true to omit writing `mtime` values for entries.
  Note that this prevents using other mtime-based features like
  `tar.update` or the `keepNewer` option with the resulting tar archive.
- `umask` Set to restrict the modes on the entries in the archive,
  somewhat like how umask works on file creation. Defaults to
  `process.umask()` on unix systems, or `0o22` on Windows.

#### warn(message, data)

If strict, emit an error with the provided message.

Otherwise, emit a `'warn'` event with the provided message and data.

### class tar.WriteEntry.Sync

Synchronous version of tar.WriteEntry

### class tar.WriteEntry.Tar

A version of tar.WriteEntry that gets its data from a tar.ReadEntry
instead of from the filesystem.

#### constructor(readEntry, options)

`readEntry` is the entry being read out of another archive.

The following options are supported:

- `portable` Omit metadata that is system-specific: `ctime`, `atime`,
  `uid`, `gid`, `uname`, `gname`, `dev`, `ino`, and `nlink`. Note
  that `mtime` is still included, because this is necessary for other
  time-based operations. Additionally, `mode` is set to a "reasonable
  default" for most unix systems, based on a `umask` value of `0o22`.
- `preservePaths` Allow absolute paths. By default, `/` is stripped
  from absolute paths.
- `strict` Treat warnings as crash-worthy errors. Default false.
- `onwarn` A function that will get called with `(code, message, data)` for
  any warnings encountered. (See "Warnings and Errors")
- `noMtime` Set to true to omit writing `mtime` values for entries.
  Note that this prevents using other mtime-based features like
  `tar.update` or the `keepNewer` option with the resulting tar archive.

### class tar.Header

A class for reading and writing header blocks.

It has the following fields:

- `nullBlock` True if decoding a block which is entirely composed of
  `0x00` null bytes. (Useful because tar files are terminated by
  at least 2 null blocks.)
- `cksumValid` True if the checksum in the header is valid, false
  otherwise.
- `needPax` True if the values, as encoded, will require a Pax
  extended header.
- `path` The path of the entry.
- `mode` The 4 lowest-order octal digits of the file mode. That is,
  read/write/execute permissions for world, group, and owner, and the
  setuid, setgid, and sticky bits.
- `uid` Numeric user id of the file owner
- `gid` Numeric group id of the file owner
- `size` Size of the file in bytes
- `mtime` Modified time of the file
- `cksum` The checksum of the header. This is generated by adding all
  the bytes of the header block, treating the checksum field itself as
  all ascii space characters (that is, `0x20`).
- `type` The human-readable name of the type of entry this represents,
  or the alphanumeric key if unknown.
- `typeKey` The alphanumeric key for the type of entry this header
  represents.
- `linkpath` The target of Link and SymbolicLink entries.
- `uname` Human-readable user name of the file owner
- `gname` Human-readable group name of the file owner
- `devmaj` The major portion of the device number. Always `0` for
  files, directories, and links.
- `devmin` The minor portion of the device number. Always `0` for
  files, directories, and links.
- `atime` File access time.
- `ctime` File change time.

#### constructor(data, [offset=0])

`data` is optional. It is either a Buffer that should be interpreted
as a tar Header starting at the specified offset and continuing for
512 bytes, or a data object of keys and values to set on the header
object, and eventually encode as a tar Header.

#### decode(block, offset)

Decode the provided buffer starting at the specified offset.

Buffer length must be greater than 512 bytes.

#### set(data)

Set the fields in the data object.

#### encode(buffer, offset)

Encode the header fields into the buffer at the specified offset.

Returns `this.needPax` to indicate whether a Pax Extended Header is
required to properly encode the specified data.

### class tar.Pax

An object representing a set of key-value pairs in an Pax extended
header entry.

It has the following fields. Where the same name is used, they have
the same semantics as the tar.Header field of the same name.

- `global` True if this represents a global extended header, or false
  if it is for a single entry.
- `atime`
- `charset`
- `comment`
- `ctime`
- `gid`
- `gname`
- `linkpath`
- `mtime`
- `path`
- `size`
- `uid`
- `uname`
- `dev`
- `ino`
- `nlink`

#### constructor(object, global)

Set the fields set in the object. `global` is a boolean that defaults
to false.

#### encode()

Return a Buffer containing the header and body for the Pax extended
header entry, or `null` if there is nothing to encode.

#### encodeBody()

Return a string representing the body of the pax extended header
entry.

#### encodeField(fieldName)

Return a string representing the key/value encoding for the specified
fieldName, or `''` if the field is unset.

### tar.Pax.parse(string, extended, global)

Return a new Pax object created by parsing the contents of the string
provided.

If the `extended` object is set, then also add the fields from that
object. (This is necessary because multiple metadata entries can
occur in sequence.)

### tar.types

A translation table for the `type` field in tar headers.

#### tar.types.name.get(code)

Get the human-readable name for a given alphanumeric code.

#### tar.types.code.get(name)

Get the alphanumeric code for a given human-readable name.
