SFTP events
-----------

**Client/Server events**

* **ready**() - Emitted after initial protocol version check has passed.

**Server-only events**

_Responses to these client requests are sent using one of the methods listed further in this document under `Server-only methods`. The valid response(s) for each request are documented below._

* **OPEN**(< _integer_ >reqID, < _string_ >filename, < _integer_ >flags, < _ATTRS_ >attrs)

    `flags` is a bitfield containing any of the flags defined in `OPEN_MODE`.
    Use the static method `flagsToString()` to convert the value to a mode
    string to be used by `fs.open()` (e.g. `'r'`).

    Respond using one of the following:

    * `handle()` - This indicates a successful opening of the file and passes
      the given handle back to the client to use to refer to this open file for
      future operations (e.g. reading, writing, closing).

    * `status()` - Use this to indicate a failure to open the requested file.

* **READ**(< _integer_ >reqID, < _Buffer_ >handle, < _integer_ >offset, < _integer_ >length)

    Respond using one of the following:

    * `data()` - Use this to send the requested chunk of data back to the client.
      The amount of data sent is allowed to be less than the `length` requested,
      for example if the file ends between `offset` and `offset + length`.

    * `status()` - Use this to indicate either end of file (`STATUS_CODE.EOF`)
      has been reached (`offset` is past the end of the file) or if an error
      occurred while reading the requested part of the file.

* **WRITE**(< _integer_ >reqID, < _Buffer_ >handle, < _integer_ >offset, < _Buffer_ >data)

    Respond using:

    * `status()` - Use this to indicate success/failure of the write to the file.

* **FSTAT**(< _integer_ >reqID, < _Buffer_ >handle)

    Respond using one of the following:

    * `attrs()` - Use this to send the attributes for the requested
      file/directory back to the client.

    * `status()` - Use this to indicate an error occurred while accessing the
      file/directory.

* **FSETSTAT**(< _integer_ >reqID, < _Buffer_ >handle, < _ATTRS_ >attrs)

    Respond using:

    * `status()` - Use this to indicates success/failure of the setting of the
      given file/directory attributes.

* **CLOSE**(< _integer_ >reqID, < _Buffer_ >handle)

    Respond using:

    * `status()` - Use this to indicate success (`STATUS_CODE.OK`) or failure of
      the closing of the file identified by `handle`.

* **OPENDIR**(< _integer_ >reqID, < _string_ >path)

    Respond using one of the following:

    * `handle()` - This indicates a successful opening of the directory and
      passes the given handle back to the client to use to refer to this open
      directory for future operations (e.g. reading directory contents, closing).

    * `status()` - Use this to indicate a failure to open the requested
      directory.

* **READDIR**(< _integer_ >reqID, < _Buffer_ >handle)

    Respond using one of the following:

    * `name()` - Use this to send one or more directory listings for the open
      directory back to the client.

    * `status()` - Use this to indicate either end of directory contents
      (`STATUS_CODE.EOF`) or if an error occurred while reading the directory
      contents.

* **LSTAT**(< _integer_ >reqID, < _string_ >path)

    Respond using one of the following:

    * `attrs()` - Use this to send the attributes for the requested
      file/directory back to the client.

    * `status()` - Use this to indicate an error occurred while accessing the
      file/directory.

* **STAT**(< _integer_ >reqID, < _string_ >path)

    Respond using one of the following:

    * `attrs()` - Use this to send the attributes for the requested
      file/directory back to the client.

    * `status()` - Use this to indicate an error occurred while accessing the
      file/directory.

* **REMOVE**(< _integer_ >reqID, < _string_ >path)

    Respond using:

    * `status()` - Use this to indicate success/failure of the removal of the
      file at `path`.

* **RMDIR**(< _integer_ >reqID, < _string_ >path)

    Respond using:

    * `status()` - Use this to indicate success/failure of the removal of the
      directory at `path`.

* **REALPATH**(< _integer_ >reqID, < _string_ >path)

    Respond using one of the following:

    * `name()` - Use this to respond with a normalized version of `path`.
      No file/directory attributes are required to be sent in this response.

    * `status()` - Use this to indicate a failure in normalizing `path`.

* **READLINK**(< _integer_ >reqID, < _string_ >path)

    Respond using one of the following:

    * `name()` - Use this to respond with the target of the symlink at `path`.
      No file/directory attributes are required to be sent in this response.

    * `status()` - Use this to indicate a failure in reading the symlink at
      `path`.

* **SETSTAT**(< _integer_ >reqID, < _string_ >path, < _ATTRS_ >attrs)

    Respond using:

    * `status()` - Use this to indicates success/failure of the setting of the
      given file/directory attributes.

* **MKDIR**(< _integer_ >reqID, < _string_ >path, < _ATTRS_ >attrs)

    Respond using:

    * `status()` - Use this to indicate success/failure of the creation of the
      directory at `path`.

* **RENAME**(< _integer_ >reqID, < _string_ >oldPath, < _string_ >newPath)

    Respond using:

    * `status()` - Use this to indicate success/failure of the renaming of the
      file/directory at `oldPath` to `newPath`.

* **SYMLINK**(< _integer_ >reqID, < _string_ >linkPath, < _string_ >targetPath)

    Respond using:

    * `status()` - Use this to indicate success/failure of the symlink creation.


Useful standalone data structures
---------------------------------

* **STATUS_CODE** - _object_ - Contains the various status codes (for use especially with `status()`):

  * `OK`

  * `EOF`

  * `NO_SUCH_FILE`

  * `PERMISSION_DENIED`

  * `FAILURE`

  * `BAD_MESSAGE`

  * `OP_UNSUPPORTED`

* **OPEN_MODE** - _object_ - Contains the various open file flags:

  * `READ`

  * `WRITE`

  * `APPEND`

  * `CREAT`

  * `TRUNC`

  * `EXCL`


Useful standalone methods
-------------------------

* **stringToFlags**(< _string_ >flagsStr) - _integer_ - Converts string flags (e.g. `'r'`, `'a+'`, etc.) to the appropriate `OPEN_MODE` flag mask. Returns `null` if conversion failed.

* **flagsToString**(< _integer_ >flagsMask) - _string_ - Converts flag mask (e.g. number containing `OPEN_MODE` values) to the appropriate string value. Returns `null` if conversion failed.


SFTP methods
------------

* **(constructor)**(< _object_ >config[, < _string_ >remoteIdentRaw]) - Creates and returns a new SFTP instance. `remoteIdentRaw` can be the raw SSH identification string of the remote party. This is used to change internal behavior based on particular SFTP implementations. `config` can contain:

    * **server** - _boolean_ - Set to `true` to create an instance in server mode. **Default:** `false`

    * **debug** - _function_ - Set this to a function that receives a single string argument to get detailed (local) debug information. **Default:** (none)



**Client-only methods**

* **fastGet**(< _string_ >remotePath, < _string_ >localPath[, < _object_ >options], < _function_ >callback) - _(void)_ - Downloads a file at `remotePath` to `localPath` using parallel reads for faster throughput. `options` can have the following properties:

    * **concurrency** - _integer_ - Number of concurrent reads **Default:** `64`

    * **chunkSize** - _integer_ - Size of each read in bytes **Default:** `32768`

    * **step** - _function_(< _integer_ >total_transferred, < _integer_ >chunk, < _integer_ >total) - Called every time a part of a file was transferred

    `callback` has 1 parameter: < _Error_ >err.

* **fastPut**(< _string_ >localPath, < _string_ >remotePath[, < _object_ >options], < _function_ >callback) - _(void)_ - Uploads a file from `localPath` to `remotePath` using parallel reads for faster throughput. `options` can have the following properties:

    * **concurrency** - _integer_ - Number of concurrent reads **Default:** `64`

    * **chunkSize** - _integer_ - Size of each read in bytes **Default:** `32768`

    * **step** - _function_(< _integer_ >total_transferred, < _integer_ >chunk, < _integer_ >total) - Called every time a part of a file was transferred

    * **mode** - _mixed_ - Integer or string representing the file mode to set for the uploaded file.

    `callback` has 1 parameter: < _Error_ >err.

* **createReadStream**(< _string_ >path[, < _object_ >options]) - _ReadStream_ - Returns a new readable stream for `path`. `options` has the following defaults:

    ```javascript
    { flags: 'r',
      encoding: null,
      handle: null,
      mode: 0o666,
      autoClose: true
    }
    ```

    `options` can include `start` and `end` values to read a range of bytes from the file instead of the entire file. Both `start` and `end` are inclusive and start at 0. The `encoding` can be `'utf8'`, `'ascii'`, or `'base64'`.

    If `autoClose` is false, then the file handle won't be closed, even if there's an error. It is your responsibility to close it and make sure there's no file handle leak. If `autoClose` is set to true (default behavior), on `error` or `end` the file handle will be closed automatically.

    An example to read the last 10 bytes of a file which is 100 bytes long:

    ```javascript
    sftp.createReadStream('sample.txt', {start: 90, end: 99});
    ```

* **createWriteStream**(< _string_ >path[, < _object_ >options]) - _WriteStream_ - Returns a new writable stream for `path`. `options` has the following defaults:

    ```javascript
    {
      flags: 'w',
      encoding: null,
      mode: 0o666,
      autoClose: true
    }
    ```

    `options` may also include a `start` option to allow writing data at some position past the beginning of the file. Modifying a file rather than replacing it may require a flags mode of 'r+' rather than the default mode 'w'.

    If 'autoClose' is set to false and you pipe to this stream, this stream will not automatically close after there is no more data upstream -- allowing future pipes and/or manual writes.

* **open**(< _string_ >filename, < _string_ >flags, [< _mixed_ >attrs_mode, ]< _function_ >callback) - _(void)_ - Opens a file `filename` with `flags` with optional _ATTRS_ object or file mode `attrs_mode`. `flags` is any of the flags supported by `fs.open` (except sync flag). `callback` has 2 parameters: < _Error_ >err, < _Buffer_ >handle.

* **close**(< _Buffer_ >handle, < _function_ >callback) - _(void)_ - Closes the resource associated with `handle` given by open() or opendir(). `callback` has 1 parameter: < _Error_ >err.

* **read**(< _Buffer_ >handle, < _Buffer_ >buffer, < _integer_ >offset, < _integer_ >length, < _integer_ >position, < _function_ >callback) - _(void)_ - Reads `length` bytes from the resource associated with `handle` starting at `position` and stores the bytes in `buffer` starting at `offset`. `callback` has 4 parameters: < _Error_ >err, < _integer_ >bytesRead, < _Buffer_ >buffer (offset adjusted), < _integer_ >position.

* **write**(< _Buffer_ >handle, < _Buffer_ >buffer, < _integer_ >offset, < _integer_ >length, < _integer_ >position, < _function_ >callback) - _(void)_ - Writes `length` bytes from `buffer` starting at `offset` to the resource associated with `handle` starting at `position`. `callback` has 1 parameter: < _Error_ >err.

* **fstat**(< _Buffer_ >handle, < _function_ >callback) - _(void)_ - Retrieves attributes for the resource associated with `handle`. `callback` has 2 parameters: < _Error_ >err, < _Stats_ >stats.

* **fsetstat**(< _Buffer_ >handle, < _ATTRS_ >attributes, < _function_ >callback) - _(void)_ - Sets the attributes defined in `attributes` for the resource associated with `handle`. `callback` has 1 parameter: < _Error_ >err.

* **futimes**(< _Buffer_ >handle, < _mixed_ >atime, < _mixed_ >mtime, < _function_ >callback) - _(void)_ - Sets the access time and modified time for the resource associated with `handle`. `atime` and `mtime` can be Date instances or UNIX timestamps. `callback` has 1 parameter: < _Error_ >err.

* **fchown**(< _Buffer_ >handle, < _integer_ >uid, < _integer_ >gid, < _function_ >callback) - _(void)_ - Sets the owner for the resource associated with `handle`. `callback` has 1 parameter: < _Error_ >err.

* **fchmod**(< _Buffer_ >handle, < _mixed_ >mode, < _function_ >callback) - _(void)_ - Sets the mode for the resource associated with `handle`. `mode` can be an integer or a string containing an octal number. `callback` has 1 parameter: < _Error_ >err.

* **opendir**(< _string_ >path, < _function_ >callback) - _(void)_ - Opens a directory `path`. `callback` has 2 parameters: < _Error_ >err, < _Buffer_ >handle.

* **readdir**(< _mixed_ >location, < _function_ >callback) - _(void)_ - Retrieves a directory listing. `location` can either be a _Buffer_ containing a valid directory handle from opendir() or a _string_ containing the path to a directory. `callback` has 2 parameters: < _Error_ >err, < _mixed_ >list. `list` is an _Array_ of `{ filename: 'foo', longname: '....', attrs: {...} }` style objects (attrs is of type _ATTR_). If `location` is a directory handle, this function may need to be called multiple times until `list` is boolean false, which indicates that no more directory entries are available for that directory handle.

* **unlink**(< _string_ >path, < _function_ >callback) - _(void)_ - Removes the file/symlink at `path`. `callback` has 1 parameter: < _Error_ >err.

* **rename**(< _string_ >srcPath, < _string_ >destPath, < _function_ >callback) - _(void)_ - Renames/moves `srcPath` to `destPath`. `callback` has 1 parameter: < _Error_ >err.

* **mkdir**(< _string_ >path, [< _ATTRS_ >attributes, ]< _function_ >callback) - _(void)_ - Creates a new directory `path`. `callback` has 1 parameter: < _Error_ >err.

* **rmdir**(< _string_ >path, < _function_ >callback) - _(void)_ - Removes the directory at `path`. `callback` has 1 parameter: < _Error_ >err.

* **stat**(< _string_ >path, < _function_ >callback) - _(void)_ - Retrieves attributes for `path`. `callback` has 2 parameter: < _Error_ >err, < _Stats_ >stats.

* **lstat**(< _string_ >path, < _function_ >callback) - _(void)_ - Retrieves attributes for `path`. If `path` is a symlink, the link itself is stat'ed instead of the resource it refers to. `callback` has 2 parameters: < _Error_ >err, < _Stats_ >stats.

* **setstat**(< _string_ >path, < _ATTRS_ >attributes, < _function_ >callback) - _(void)_ - Sets the attributes defined in `attributes` for `path`. `callback` has 1 parameter: < _Error_ >err.

* **utimes**(< _string_ >path, < _mixed_ >atime, < _mixed_ >mtime, < _function_ >callback) - _(void)_ - Sets the access time and modified time for `path`. `atime` and `mtime` can be Date instances or UNIX timestamps. `callback` has 1 parameter: < _Error_ >err.

* **chown**(< _string_ >path, < _integer_ >uid, < _integer_ >gid, < _function_ >callback) - _(void)_ - Sets the owner for `path`. `callback` has 1 parameter: < _Error_ >err.

* **chmod**(< _string_ >path, < _mixed_ >mode, < _function_ >callback) - _(void)_ - Sets the mode for `path`. `mode` can be an integer or a string containing an octal number. `callback` has 1 parameter: < _Error_ >err.

* **readlink**(< _string_ >path, < _function_ >callback) - _(void)_ - Retrieves the target for a symlink at `path`. `callback` has 2 parameters: < _Error_ >err, < _string_ >target.

* **symlink**(< _string_ >targetPath, < _string_ >linkPath, < _function_ >callback) - _(void)_ - Creates a symlink at `linkPath` to `targetPath`. `callback` has 1 parameter: < _Error_ >err.

* **realpath**(< _string_ >path, < _function_ >callback) - _(void)_ - Resolves `path` to an absolute path. `callback` has 2 parameters: < _Error_ >err, < _string_ >absPath.

* **ext_openssh_rename**(< _string_ >srcPath, < _string_ >destPath, < _function_ >callback) - _(void)_ - **OpenSSH extension** Performs POSIX rename(3) from `srcPath` to `destPath`. `callback` has 1 parameter: < _Error_ >err.

* **ext_openssh_statvfs**(< _string_ >path, < _function_ >callback) - _(void)_ - **OpenSSH extension** Performs POSIX statvfs(2) on `path`. `callback` has 2 parameters: < _Error_ >err, < _object_ >fsInfo. `fsInfo` contains the information as found in the [statvfs struct](http://linux.die.net/man/2/statvfs).

* **ext_openssh_fstatvfs**(< _Buffer_ >handle, < _function_ >callback) - _(void)_ - **OpenSSH extension** Performs POSIX fstatvfs(2) on open handle `handle`. `callback` has 2 parameters: < _Error_ >err, < _object_ >fsInfo. `fsInfo` contains the information as found in the [statvfs struct](http://linux.die.net/man/2/statvfs).

* **ext_openssh_hardlink**(< _string_ >targetPath, < _string_ >linkPath, < _function_ >callback) - _(void)_ - **OpenSSH extension** Performs POSIX link(2) to create a hard link to `targetPath` at `linkPath`. `callback` has 1 parameter: < _Error_ >err.

* **ext_openssh_fsync**(< _Buffer_ >handle, < _function_ >callback) - _(void)_ - **OpenSSH extension** Performs POSIX fsync(3) on the open handle `handle`. `callback` has 1 parameter: < _Error_ >err.

* **ext_openssh_lsetstat**(< _string_ >path, < _ATTRS_ >attributes, < _function_ >callback) - _(void)_ - **OpenSSH extension** Similar to `setstat()`, but instead sets attributes on symlinks. `callback` has 1 parameter: < _Error_ >err.

* **ext_openssh_expandPath**(< _string_ >path, < _function_ >callback) - _(void)_ - **OpenSSH extension** Similar to `realpath()`, but supports tilde-expansion, i.e. "\~", "\~/..." and "\~user/...". These paths are expanded using shell-like rules. `callback` has 2 parameters: < _Error_ >err, < _string_ >expandedPath.

* **ext_copy_data**(< _Buffer_ >srcHandle, < _number_ >srcOffset, < _number_ >length, < _Buffer_ >dstHandle, < _number_ >dstOffset, < _function_ >callback) - _(void)_ - Performs a remote file copy. If `length` is 0, then the server will read from `srcHandle` until EOF is reached. `callback` has 1 parameter: < _Error_ >err.

* **ext_home_dir**(< _string_ >username, < _function_ >callback) - _(void)_ - Retrieves the home directory of the user identified by `username`. Use an empty string to refer to the current user. `callback` has 2 parameters: < _Error_ >err, < _string_ >homeDirectory.

* **ext_users_groups**(< _array_ >uids, < _array_ >gids, < _function_ >callback) - _(void)_ - Retrieves the user names and group names associated with the user IDs in `uids` and group IDs in `gids` respectively. Either array can be empty or contain one or more 32-bit unsigned integers. The retrieved user names and group names match the same order as the IDs in `uids` and `gids` respectively. If the server was unable to find a name for a given ID, it will use an empty string. `callback` has 3 parameters: < _Error_ >err, < _array_ >userNames, < _array_ >groupNames.


**Server-only methods**

* **status**(< _integer_ >reqID, < _integer_ >statusCode[, < _string_ >message]) - _(void)_ - Sends a status response for the request identified by `id`.

* **handle**(< _integer_ >reqID, < _Buffer_ >handle) - _(void)_ - Sends a handle response for the request identified by `id`. `handle` must be less than 256 bytes and is an opaque value that could merely contain the value of a backing file descriptor or some other unique, custom value.

* **data**(< _integer_ >reqID, < _mixed_ >data[, < _string_ >encoding]) - _(void)_ - Sends a data response for the request identified by `id`. `data` can be a _Buffer_ or _string_. If `data` is a string, `encoding` is the encoding of `data`.

* **name**(< _integer_ >reqID, < _array_ >names) - _(void)_ - Sends a name response for the request identified by `id`. `names` must be an _array_ of _object_ where each _object_ can contain:

    * **filename** - _string_ - The entry's name.

    * **longname** - _string_ - This is the `ls -l`-style format for the entry (e.g. `-rwxr--r--  1 bar   bar       718 Dec  8  2009 foo`)

    * **attrs** - _ATTRS_ - This is an optional _ATTRS_ object that contains requested/available attributes for the entry.

* **attrs**(< _integer_ >reqID, < _ATTRS_ >attrs) - _(void)_ - Sends an attrs response for the request identified by `id`. `attrs` contains the requested/available attributes.


ATTRS
-----

An object with the following valid properties:

* **mode** - _integer_ - Mode/permissions for the resource.

* **uid** - _integer_ - User ID of the resource.

* **gid** - _integer_ - Group ID of the resource.

* **size** - _integer_ - Resource size in bytes.

* **atime** - _integer_ - UNIX timestamp of the access time of the resource.

* **mtime** - _integer_ - UNIX timestamp of the modified time of the resource.

When supplying an ATTRS object to one of the SFTP methods:

* `atime` and `mtime` can be either a Date instance or a UNIX timestamp.

* `mode` can either be an integer or a string containing an octal number.


Stats
-----

An object with the same attributes as an ATTRS object with the addition of the following methods:

* `stats.isDirectory()`

* `stats.isFile()`

* `stats.isBlockDevice()`

* `stats.isCharacterDevice()`

* `stats.isSymbolicLink()`

* `stats.isFIFO()`

* `stats.isSocket()`
