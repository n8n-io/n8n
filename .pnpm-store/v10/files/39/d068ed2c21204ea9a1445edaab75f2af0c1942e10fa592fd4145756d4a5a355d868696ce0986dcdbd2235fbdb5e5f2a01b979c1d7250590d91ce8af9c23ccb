pg-minify
=========

[![Build Status](https://github.com/vitaly-t/pg-minify/actions/workflows/ci.yml/badge.svg)](https://github.com/vitaly-t/pg-minify/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/nodejs-14%20--%2020-green.svg?logo=node.js&style=flat)](https://nodejs.org)

Minifies PostgreSQL scripts, reducing the IO usage.

**Features:**

* Removes `/*multi-line*/` (including nested) and `--single-line` comments
* Preserves special/copyright multi-line comments that start with `/*!`
* Concatenates multi-line strings into a single line with `\n`
* Fixes multi-line text, prefixing it with `E` where needed
* Removes redundant line gaps: line breaks, tabs and spaces
* Provides basic parsing and error detection for invalid SQL
* Flattens the resulting script into a single line
* Optionally, compresses SQL for minimum space 

## Installing

```
$ npm install pg-minify
```

## Usage

```js
const minify = require('pg-minify');

const sql = 'SELECT 1; -- comments';

minify(sql); //=> SELECT 1;
```

with compression (removes all unnecessary spaces):

```js
const sql = 'SELECT * FROM "table" WHERE col = 123; -- comments';

minify(sql, {compress: true});
//=> SELECT*FROM"table"WHERE col=123;
```

The library's distribution includes [TypeScript] declarations.

## Error Handling

[SQLParsingError] is thrown on failed SQL parsing:

```js
try {
    minify('SELECT \'1');
} catch (error) {
    // error is minify.SQLParsingError instance
    // error.message:
    // Error parsing SQL at {line:1,col:8}: Unclosed text block.
}
```

## API

### minify(sql, [options]) ⇒ String

Minifies SQL into a single line, according to the `options`.

##### options.compress ⇒ Boolean

Compresses / uglifies the SQL to its bare minimum, by removing all unnecessary spaces.

* `false (default)` - keeps minimum spaces, for easier read
* `true` - removes all unnecessary spaces 

See also: [SQL Compression].

##### options.removeAll ⇒ Boolean

Removes everything, i.e. special/copyright multi-line comments that start with `/*!` will be removed as well.

## Limitations

Double-dollar `$$` string escaping, which avoids escaping single quotes is not supported.
See [issue #12](https://github.com/vitaly-t/pg-minify/issues/12).

## License

Copyright © 2020 [Vitaly Tomilov](https://github.com/vitaly-t);
Released under the MIT license.

[SQLParsingError]:https://github.com/vitaly-t/pg-minify/blob/master/lib/error.js#L22
[TypeScript]:https://github.com/vitaly-t/pg-minify/tree/master/typescript
[SQL Compression]:https://github.com/vitaly-t/pg-minify/wiki/SQL-Compression
