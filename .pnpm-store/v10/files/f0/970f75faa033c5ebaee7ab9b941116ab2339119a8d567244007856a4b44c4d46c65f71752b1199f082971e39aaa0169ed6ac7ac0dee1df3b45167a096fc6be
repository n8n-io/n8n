# pg-types

This is the code that turns all the raw text from postgres into JavaScript types for [node-postgres](https://github.com/brianc/node-postgres.git)

## use

This module is consumed and exported from the root `pg` object of node-postgres.  To access it, do the following:

```js
var types = require('pg').types
```

Generally what you'll want to do is override how a specific data-type is parsed and turned into a JavaScript type.  By default the PostgreSQL backend server returns everything as strings.  Every data type corresponds to a unique `OID` within the server, and these `OIDs` are sent back with the query response.  So, you need to match a particluar `OID` to a function you'd like to use to take the raw text input and produce a valid JavaScript object as a result. `null` values are never parsed.

Let's do something I commonly like to do on projects: return 64-bit integers `(int8)` as JavaScript integers.  Because JavaScript doesn't have support for 64-bit integers node-postgres cannot confidently parse `int8` data type results as numbers because if you have a _huge_ number it will overflow and the result you'd get back from node-postgres would not be the result in the database.  That would be a __very bad thing__ so node-postgres just returns `int8` results as strings and leaves the parsing up to you.  Let's say that you know you don't and wont ever have numbers greater than `int4` in your database, but you're tired of receiving results from the `COUNT(*)` function as strings (because that function returns `int8`).  You would do this:

```js
var types = require('pg').types
types.setTypeParser(20, function(val) {
  return parseInt(val, 10)
})
```

__boom__: now you get numbers instead of strings.

Just as another example -- not saying this is a good idea -- let's say you want to return all dates from your database as [moment](http://momentjs.com/docs/) objects.  Okay, do this:

```js
var types = require('pg').types
var moment = require('moment')
var parseFn = function(val) {
   return val === null ? null : moment(val)
}
types.setTypeParser(types.builtins.TIMESTAMPTZ, parseFn)
types.setTypeParser(types.builtins.TIMESTAMP, parseFn)
```
_note: I've never done that with my dates, and I'm not 100% sure moment can parse all the date strings returned from postgres.  It's just an example!_

If you're thinking "gee, this seems pretty handy, but how can I get a list of all the OIDs in the database and what they correspond to?!?!?!" worry not:

```bash
$ psql -c "select typname, oid, typarray from pg_type order by oid"
```

If you want to find out the OID of a specific type:

```bash
$ psql -c "select typname, oid, typarray from pg_type where typname = 'daterange' order by oid"
```

:smile:

## license

The MIT License (MIT)

Copyright (c) 2014 Brian M. Carlson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
