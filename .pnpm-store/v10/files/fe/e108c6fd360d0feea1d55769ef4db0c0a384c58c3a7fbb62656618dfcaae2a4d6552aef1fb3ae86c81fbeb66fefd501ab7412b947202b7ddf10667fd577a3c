# pgpass

[![Build Status](https://github.com/hoegaarden/pgpass/workflows/CI/badge.svg?branch=master)](https://github.com/hoegaarden/pgpass/actions?query=workflow%3ACI+branch%3Amaster)

## Install

```sh
npm install pgpass
```

## Usage
```js
var pgPass = require('pgpass');

var connInfo = {
  'host' : 'pgserver' ,
  'user' : 'the_user_name' ,
};

pgPass(connInfo, function(pass){
  conn_info.password = pass;
  // connect to postgresql server
});
```

## Description

This module tries to read the `~/.pgpass` file (or the equivalent for windows systems). If the environment variable `PGPASSFILE` is set, this file is used instead. If everything goes right, the password from said file is passed to the callback; if the password cannot be read `undefined` is passed to the callback.

Cases where `undefined` is returned:

- the environment variable `PGPASSWORD` is set
- the file cannot be read (wrong permissions, no such file, ...)
- for non windows systems: the file is write-/readable by the group or by other users
- there is no matching line for the given connection info

There should be no need to use this module directly; it is already included in `node-postgres`.

## Configuration

The module reads the environment variable `PGPASS_NO_DEESCAPE` to decide if the the read tokens from the password file should be de-escaped or not. Default is to do de-escaping. For further information on this see [this commit](https://github.com/postgres/postgres/commit/8d15e3ec4fcb735875a8a70a09ec0c62153c3329).


## Tests

There are tests in `./test/`; including linting and coverage testing. Running `npm test` runs:

- `jshint`
- `mocha` tests
- `jscoverage` and `mocha -R html-cov`

You can see the coverage report in `coverage.html`.


## Development, Patches, Bugs, ...

If you find Bugs or have improvements, please feel free to open a issue on GitHub. If you provide a pull request, I'm more than happy to merge them, just make sure to add tests for your changes.

## Links

- https://github.com/hoegaarden/node-pgpass
- http://www.postgresql.org/docs/current/static/libpq-pgpass.html
- https://wiki.postgresql.org/wiki/Pgpass
- https://github.com/postgres/postgres/blob/master/src/interfaces/libpq/fe-connect.c

## License

Copyright (c) 2013-2016 Hannes Hörl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
