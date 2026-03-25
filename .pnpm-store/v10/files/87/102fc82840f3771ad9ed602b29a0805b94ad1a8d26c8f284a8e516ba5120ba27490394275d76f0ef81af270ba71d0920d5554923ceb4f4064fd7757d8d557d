# postgres-date [![Build Status](https://travis-ci.org/bendrucker/postgres-date.svg?branch=master)](https://travis-ci.org/bendrucker/postgres-date) [![Greenkeeper badge](https://badges.greenkeeper.io/bendrucker/postgres-date.svg)](https://greenkeeper.io/)

> Postgres date output parser

This package parses [date/time outputs](https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME-OUTPUT) from Postgres into Javascript `Date` objects. Its goal is to match Postgres behavior and preserve data accuracy.

If you find a case where a valid Postgres output results in incorrect parsing (including loss of precision), please [create a pull request](https://github.com/bendrucker/postgres-date/compare) and provide a failing test.

**Supported Postgres Versions:** `>= 9.6`

All prior versions of Postgres are likely compatible but not officially supported.

## Install

```
$ npm install --save postgres-date
```


## Usage

```js
var parse = require('postgres-date')
parse('2011-01-23 22:15:51Z')
// => 2011-01-23T22:15:51.000Z
```

## API

#### `parse(isoDate)` -> `date`

##### isoDate

*Required*  
Type: `string`

A date string from Postgres.

## Releases

The following semantic versioning increments will be used for changes:

* **Major**: Removal of support for Node.js versions or Postgres versions (not expected)
* **Minor**: Unused, since Postgres returns dates in standard ISO 8601 format
* **Patch**: Any fix for parsing behavior

## License

MIT © [Ben Drucker](http://bendrucker.me)
