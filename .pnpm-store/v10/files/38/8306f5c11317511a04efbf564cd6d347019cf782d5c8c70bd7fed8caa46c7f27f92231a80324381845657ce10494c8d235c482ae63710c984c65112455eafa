Description
===========

node-ftp is an FTP client module for [node.js](http://nodejs.org/) that provides an asynchronous interface for communicating with an FTP server.


Requirements
============

* [node.js](http://nodejs.org/) -- v0.8.0 or newer


Install
=======

    npm install ftp


Examples
========

* Get a directory listing of the current (remote) working directory:

```javascript
  var Client = require('ftp');

  var c = new Client();
  c.on('ready', function() {
    c.list(function(err, list) {
      if (err) throw err;
      console.dir(list);
      c.end();
    });
  });
  // connect to localhost:21 as anonymous
  c.connect();
```

* Download remote file 'foo.txt' and save it to the local file system:

```javascript
  var Client = require('ftp');
  var fs = require('fs');

  var c = new Client();
  c.on('ready', function() {
    c.get('foo.txt', function(err, stream) {
      if (err) throw err;
      stream.once('close', function() { c.end(); });
      stream.pipe(fs.createWriteStream('foo.local-copy.txt'));
    });
  });
  // connect to localhost:21 as anonymous
  c.connect();
```

* Upload local file 'foo.txt' to the server:

```javascript
  var Client = require('ftp');
  var fs = require('fs');

  var c = new Client();
  c.on('ready', function() {
    c.put('foo.txt', 'foo.remote-copy.txt', function(err) {
      if (err) throw err;
      c.end();
    });
  });
  // connect to localhost:21 as anonymous
  c.connect();
```


API
===

Events
------

* **greeting**(< _string_ >msg) - Emitted after connection. `msg` is the text the server sent upon connection.

* **ready**() - Emitted when connection and authentication were sucessful.

* **close**(< _boolean_ >hadErr) - Emitted when the connection has fully closed.

* **end**() - Emitted when the connection has ended.

* **error**(< _Error_ >err) - Emitted when an error occurs. In case of protocol-level errors, `err` contains a 'code' property that references the related 3-digit FTP response code.


Methods
-------

**\* Note: As with the 'error' event, any error objects passed to callbacks will have a 'code' property for protocol-level errors.**

* **(constructor)**() - Creates and returns a new FTP client instance.

* **connect**(< _object_ >config) - _(void)_ - Connects to an FTP server. Valid config properties:

    * host - _string_ - The hostname or IP address of the FTP server. **Default:** 'localhost'

    * port - _integer_ - The port of the FTP server. **Default:** 21

    * secure - _mixed_ - Set to true for both control and data connection encryption, 'control' for control connection encryption only, or 'implicit' for implicitly encrypted control connection (this mode is deprecated in modern times, but usually uses port 990) **Default:** false

    * secureOptions - _object_ - Additional options to be passed to `tls.connect()`. **Default:** (none)

    * user - _string_ - Username for authentication. **Default:** 'anonymous'

    * password - _string_ - Password for authentication. **Default:** 'anonymous@'

    * connTimeout - _integer_ - How long (in milliseconds) to wait for the control connection to be established. **Default:** 10000

    * pasvTimeout - _integer_ - How long (in milliseconds) to wait for a PASV data connection to be established. **Default:** 10000

    * keepalive - _integer_ - How often (in milliseconds) to send a 'dummy' (NOOP) command to keep the connection alive. **Default:** 10000

* **end**() - _(void)_ - Closes the connection to the server after any/all enqueued commands have been executed.

* **destroy**() - _(void)_ - Closes the connection to the server immediately.

### Required "standard" commands (RFC 959)

* **list**([< _string_ >path, ][< _boolean_ >useCompression, ]< _function_ >callback) - _(void)_ - Retrieves the directory listing of `path`. `path` defaults to the current working directory. `useCompression` defaults to false. `callback` has 2 parameters: < _Error_ >err, < _array_ >list. `list` is an array of objects with these properties:

      * type - _string_ - A single character denoting the entry type: 'd' for directory, '-' for file (or 'l' for symlink on **\*NIX only**).

      * name - _string_ - The name of the entry.

      * size - _string_ - The size of the entry in bytes.

      * date - _Date_ - The last modified date of the entry.

      * rights - _object_ - The various permissions for this entry **(*NIX only)**.

          * user - _string_ - An empty string or any combination of 'r', 'w', 'x'.

          * group - _string_ - An empty string or any combination of 'r', 'w', 'x'.

          * other - _string_ - An empty string or any combination of 'r', 'w', 'x'.

      * owner - _string_ - The user name or ID that this entry belongs to **(*NIX only)**.

      * group - _string_ - The group name or ID that this entry belongs to **(*NIX only)**.

      * target - _string_ - For symlink entries, this is the symlink's target **(*NIX only)**.

      * sticky - _boolean_ - True if the sticky bit is set for this entry **(*NIX only)**.

* **get**(< _string_ >path, [< _boolean_ >useCompression, ]< _function_ >callback) - _(void)_ - Retrieves a file at `path` from the server. `useCompression` defaults to false. `callback` has 2 parameters: < _Error_ >err, < _ReadableStream_ >fileStream.

* **put**(< _mixed_ >input, < _string_ >destPath, [< _boolean_ >useCompression, ]< _function_ >callback) - _(void)_ - Sends data to the server to be stored as `destPath`. `input` can be a ReadableStream, a Buffer, or a path to a local file. `useCompression` defaults to false. `callback` has 1 parameter: < _Error_ >err.

* **append**(< _mixed_ >input, < _string_ >destPath, [< _boolean_ >useCompression, ]< _function_ >callback) - _(void)_ - Same as **put()**, except if `destPath` already exists, it will be appended to instead of overwritten.

* **rename**(< _string_ >oldPath, < _string_ >newPath, < _function_ >callback) - _(void)_ - Renames `oldPath` to `newPath` on the server. `callback` has 1 parameter: < _Error_ >err.

* **logout**(< _function_ >callback) - _(void)_ - Logout the user from the server. `callback` has 1 parameter: < _Error_ >err.

* **delete**(< _string_ >path, < _function_ >callback) - _(void)_ - Deletes a file, `path`, on the server. `callback` has 1 parameter: < _Error_ >err.

* **cwd**(< _string_ >path, < _function_ >callback) - _(void)_ - Changes the current working directory to `path`. `callback` has 2 parameters: < _Error_ >err, < _string_ >currentDir. Note: `currentDir` is only given if the server replies with the path in the response text.

* **abort**(< _function_ >callback) - _(void)_ - Aborts the current data transfer (e.g. from get(), put(), or list()). `callback` has 1 parameter: < _Error_ >err.

* **site**(< _string_ >command, < _function_ >callback) - _(void)_ - Sends `command` (e.g. 'CHMOD 755 foo', 'QUOTA') using SITE. `callback` has 3 parameters: < _Error_ >err, < _string >responseText, < _integer_ >responseCode.

* **status**(< _function_ >callback) - _(void)_ - Retrieves human-readable information about the server's status. `callback` has 2 parameters: < _Error_ >err, < _string_ >status.

* **ascii**(< _function_ >callback) - _(void)_ - Sets the transfer data type to ASCII. `callback` has 1 parameter: < _Error_ >err.

* **binary**(< _function_ >callback) - _(void)_ - Sets the transfer data type to binary (default at time of connection). `callback` has 1 parameter: < _Error_ >err.

### Optional "standard" commands (RFC 959)

* **mkdir**(< _string_ >path, [< _boolean_ >recursive, ]< _function_ >callback) - _(void)_ - Creates a new directory, `path`, on the server. `recursive` is for enabling a 'mkdir -p' algorithm and defaults to false. `callback` has 1 parameter: < _Error_ >err.

* **rmdir**(< _string_ >path, [< _boolean_ >recursive, ]< _function_ >callback) - _(void)_ - Removes a directory, `path`, on the server. If `recursive`, this call will delete the contents of the directory if it is not empty. `callback` has 1 parameter: < _Error_ >err.

* **cdup**(< _function_ >callback) - _(void)_ - Changes the working directory to the parent of the current directory. `callback` has 1 parameter: < _Error_ >err.

* **pwd**(< _function_ >callback) - _(void)_ - Retrieves the current working directory. `callback` has 2 parameters: < _Error_ >err, < _string_ >cwd.

* **system**(< _function_ >callback) - _(void)_ - Retrieves the server's operating system. `callback` has 2 parameters: < _Error_ >err, < _string_ >OS.

* **listSafe**([< _string_ >path, ][< _boolean_ >useCompression, ]< _function_ >callback) - _(void)_ - Similar to list(), except the directory is temporarily changed to `path` to retrieve the directory listing. This is useful for servers that do not handle characters like spaces and quotes in directory names well for the LIST command. This function is "optional" because it relies on pwd() being available.

### Extended commands (RFC 3659)

* **size**(< _string_ >path, < _function_ >callback) - _(void)_ - Retrieves the size of `path`. `callback` has 2 parameters: < _Error_ >err, < _integer_ >numBytes.

* **lastMod**(< _string_ >path, < _function_ >callback) - _(void)_ - Retrieves the last modified date and time for `path`. `callback` has 2 parameters: < _Error_ >err, < _Date_ >lastModified.

* **restart**(< _integer_ >byteOffset, < _function_ >callback) - _(void)_ - Sets the file byte offset for the next file transfer action (get/put) to `byteOffset`. `callback` has 1 parameter: < _Error_ >err.

* **mlsd**([< _string_ >path, ][< _boolean_ >useCompression, ]< _function_ >callback) - _(void)_ - Retrieves the directory listing of `path`. `path` defaults to the current working directory. `useCompression` defaults to false. `callback` has 2 parameters: < _Error_ >err, < _array_ >list. See the `list` command for a list of properties. Also see https://tools.ietf.org/html/rfc3659 7.2.
