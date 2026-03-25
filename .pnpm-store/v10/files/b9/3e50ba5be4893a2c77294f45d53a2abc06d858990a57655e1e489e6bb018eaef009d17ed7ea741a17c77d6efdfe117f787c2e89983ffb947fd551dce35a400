pg-promise
==========

[![Build Status](https://github.com/vitaly-t/pg-promise/workflows/ci/badge.svg?branch=master)](https://github.com/vitaly-t/pg-promise/actions?query=workflow%3Aci+branch%3Amaster)
[![Node Version](https://img.shields.io/badge/nodejs-14%20--%2020-green.svg?logo=node.js&style=flat)](https://nodejs.org)
[![Postgres Version](https://img.shields.io/badge/postgresql-10%20--%2016-green.svg?logo=postgresql&style=flat)](https://www.postgresql.org)

---

PostgreSQL interface for Node.js

---

* [About](#about)
* [Support & Sponsorship](#support--sponsorship)
* [Documentation](#documentation)
* [Contributing](#contributing) 
* [Usage]
  - [Methods](#methods)
  - [Query Formatting](#query-formatting)
    - [Index Variables]  
    - [Named Parameters]
      - [Nested Named Parameters]
  - [Formatting Filters](#formatting-filters)          
    - [SQL Names]  
      - [Alias Filter]    
    - [Raw Text]  
    - [Open Values]
    - [JSON Filter]
    - [CSV Filter]    
  - [Custom Type Formatting]
    - [Explicit CTF]
    - [Symbolic CTF]    
  - [Query Files]    
  - [Tasks]    
    - [Conditional Tasks]  
  - [Transactions]    
    - [Nested Transactions]    
      - [Limitations]   
    - [Configurable Transactions]
    - [Conditional Transactions]    
  - [Library de-initialization]

---

# About

Built on top of [node-postgres], this library adds the following:

* Automatic connections
* Automatic transactions
* Powerful query-formatting engine + query generation
* Declarative approach to handling query results
* Global events reporting for central handling
* Extensive support for external SQL files
* Support for all promise libraries

At its inception in 2015, this library was only adding promises to the base driver, hence the name `pg-promise`.
And while the original name was kept, the library's functionality was vastly extended, with promises now being
only its tiny part.

# Support & Sponsorship  

I do free support here and on [StackOverflow](https://stackoverflow.com/questions/tagged/pg-promise).

And if you want to help this project, I can accept Bitcoin: `1yki7MXMkuDw8qqe5icVdh1GJZSQSzKZp`

# Documentation

Chapter [Usage] below explains the basics you need to know, while the [Official Documentation]
gets you started, and provides links to all other resources.

# Contributing

Please read the [Contribution Notes] before opening any new issue or PR.

# Usage

Once you have created a [Database] object, according to the steps in the [Official Documentation],
you get access to the methods documented below. 

## Methods 

All query methods of the library are based off generic method [query].

You should normally use only the derived, result-specific methods for executing queries, all of which are named according
to how many rows of data the query is expected to return, so for each query you should pick the right method:
[none], [one], [oneOrNone], [many], [manyOrNone] = [any]. Do not confuse the method name for the number of rows
to be affected by the query, which is completely irrelevant.

By relying on the result-specific methods you protect your code from an unexpected number of data rows,
to be automatically rejected (treated as errors).  

There are also a few specific methods that you will often need:

* [result], [multi], [multiResult] - for verbose and/or multi-query results;
* [map], [each] - for simpler/inline result pre-processing/re-mapping;
* [func], [proc] - to simplify execution of SQL functions/procedures;
* [stream] - to access rows from a query via a read stream;
* [connect], [task], [tx] + [txIf] - for shared connections + automatic transactions, each exposing a connected protocol
  that has additional methods [batch], [page] and [sequence].

The protocol is fully customizable / extendable via event [extend].

**IMPORTANT:**

The most important methods to understand from start are [task] and [tx]/[txIf] (see [Tasks] and [Transactions]).
As documented for method [query], it acquires and releases the connection, which makes it a poor choice for executing
multiple queries at once. For this reason, [Chaining Queries] is a must-read, to avoid writing the code that misuses connections.

[Learn by Example] is a beginner's tutorial based on examples.

## Query Formatting

This library comes with embedded query-formatting engine that offers high-performance value escaping,
flexibility and extensibility. It is used by default with all query methods, unless you opt out of it entirely
via option `pgFormatting` within [Initialization Options].  

All formatting methods used internally are available from the [formatting] namespace, so they can also be used
directly when needed. The main method there is [format], used by every query method to format the query. 

The formatting syntax for variables is decided from the type of `values` passed in:

* [Index Variables] when `values` is an array or a single basic type;
* [Named Parameters] when `values` is an object (other than `Array` or `null`).

**ATTENTION:** Never use ES6 template strings or manual concatenation to generate queries, as both
can easily result in broken queries! Only this library's formatting engine knows how to properly escape
variable values for PostgreSQL.

### Index Variables

The simplest (classic) formatting uses `$1, $2, ...` syntax to inject values into the query string,
based on their index (from `$1` to `$100000`) from the array of values: 

```js
await db.any('SELECT * FROM product WHERE price BETWEEN $1 AND $2', [1, 10])
```

The formatting engine also supports single-value parametrization for queries that use only variable `$1`: 

```js
await db.any('SELECT * FROM users WHERE name = $1', 'John')
```

This however works only for types `number`, `bigint`, `string`, `boolean`, `Date` and `null`, because types like `Array`
and `Object` change the way parameters are interpreted. That's why passing in index variables within an array
is advised as safer, to avoid ambiguities.

### Named Parameters

When a query method is parameterized with `values` as an object, the formatting engine expects the query to use
the Named Parameter syntax `$*propName*`, with `*` being any of the following open-close pairs: `{}`, `()`, `<>`, `[]`, `//`.

```js
// We can use every supported variable syntax at the same time, if needed:
await db.none('INSERT INTO users(first_name, last_name, age) VALUES(${name.first}, $<name.last>, $/age/)', {
    name: {first: 'John', last: 'Dow'},
    age: 30
});
```

**IMPORTANT:** Never use the reserved `${}` syntax inside ES6 template strings, as those have no knowledge of how to format values
for PostgreSQL. Inside ES6 template strings you should only use one of the 4 alternatives - `$()`, `$<>`, `$[]` or `$//`.
In general, you should either use the standard strings for SQL, or place SQL into external files - see [Query Files]. 

Valid variable names are limited to the syntax of open-name JavaScript variables. And name `this` has special meaning - it refers
to the formatting object itself (see below).

Keep in mind that while property values `null` and `undefined` are both formatted as `null`, an error is thrown when the
property does not exist.

**`this` reference**

Property `this` refers to the formatting object itself, to be inserted as a JSON-formatted string.

```js
await db.none('INSERT INTO documents(id, doc) VALUES(${id}, ${this})', {
    id: 123,
    body: 'some text'    
})
//=> INSERT INTO documents(id, doc) VALUES(123, '{"id":123,"body":"some text"}')
```    

#### Nested Named Parameters

[Named Parameters] support property name nesting of any depth.

<details>
<summary><b>Example</b></summary>

```js
const obj = {
    one: {
        two: {
            three: {
                value1: 123,
                value2: a => {
                    // a = obj.one.two.three
                    return 'hello';
                },
                value3: function(a) {
                    // a = this = obj.one.two.three
                    return 'world';
                },
                value4: {
                    toPostgres: a => {
                        // Custom Type Formatting
                        // a = obj.one.two.three.value4
                        return a.text;
                    },
                    text: 'custom'
                }                
            }
        }
    }
};
await db.one('SELECT ${one.two.three.value1}', obj); //=> SELECT 123
await db.one('SELECT ${one.two.three.value2}', obj); //=> SELECT 'hello'
await db.one('SELECT ${one.two.three.value3}', obj); //=> SELECT 'world'
await db.one('SELECT ${one.two.three.value4}', obj); //=> SELECT 'custom'
```
</details>
<br/>

The last name in the resolution can be anything, including:

* the actual value (basic JavaScript type)
* a function that returns:
  - the actual value
  - another function
  - a [Custom Type Formatting] object
* a [Custom Type Formatting] object that returns:
  - the actual value
  - another [Custom Type Formatting] object
  - a function

i.e. the resolution chain is infinitely flexible, and supports recursion without limits.

Please note, however, that nested parameters are not supported within the [helpers] namespace.

## Formatting Filters

By default, all values are formatted according to their JavaScript type. Formatting filters (or modifiers),
change that, so the value is formatted differently.

Note that formatting filters work only for normal queries, and are not available within [PreparedStatement] or
[ParameterizedQuery], because those are, by definition, formatted on the server side.

Filters use the same syntax for [Index Variables] and [Named Parameters], following immediately the variable name:

<details>
<summary><b>With Index Variables</b></summary>

```js
await db.any('SELECT $1:name FROM $2:name', ['price', 'products'])
//=> SELECT "price" FROM "products"
```
</details>

<details>
<summary><b>With Named Parameters</b></summary>

```js
await db.any('SELECT ${column:name} FROM ${table:name}', {
    column: 'price',
    table: 'products'    
});
//=> SELECT "price" FROM "products"
```
</details>
<br/>

The following filters are supported:

* `:name` / `~` - [SQL Names]
  - `:alias` - [Alias Filter]
* `:raw` / `^` - [Raw Text]
* `:value` / `#` - [Open Values]
* `:csv` / `:list` - [CSV Filter]
* `:json` - [JSON Filter]

### SQL Names

When a variable name ends with `:name`, or shorter syntax `~` (tilde), it represents an SQL name or identifier,
to be escaped accordingly:

<details>
<summary><b>Using ~ filter</b></summary>

```js
await db.query('INSERT INTO $1~($2~) VALUES(...)', ['Table Name', 'Column Name']);
//=> INSERT INTO "Table Name"("Column Name") VALUES(...)
```
</details>

<details>
<summary><b>Using :name filter</b></summary>

```js
await db.query('INSERT INTO $1:name($2:name) VALUES(...)', ['Table Name', 'Column Name']);
//=> INSERT INTO "Table Name"("Column Name") VALUES(...)
```
</details>
<br/>

Typically, an SQL name variable is a text string, which must be at least 1 character long.
However, `pg-promise` supports a variety of ways in which SQL names can be supplied:

* A string that contains only `*` (asterisks) is automatically recognized as _all columns_:

```js
await db.query('SELECT $1:name FROM $2:name', ['*', 'table']);
//=> SELECT * FROM "table"
```

* An array of strings to represent column names:

```js
await db.query('SELECT ${columns:name} FROM ${table:name}', {
    columns: ['column1', 'column2'],
    table: 'table'
});
//=> SELECT "column1","column2" FROM "table"
```

* Any object that's not an array gets its properties enumerated for column names:

```js
const obj = {
    one: 1,
    two: 2
};

await db.query('SELECT $1:name FROM $2:name', [obj, 'table']);
//=> SELECT "one","two" FROM "table"
```

In addition, the syntax supports `this` to enumerate column names from the formatting object:
 
```js
const obj = {
    one: 1,
    two: 2
};

await db.query('INSERT INTO table(${this:name}) VALUES(${this:csv})', obj);
//=> INSERT INTO table("one","two") VALUES(1, 2)
```

Relying on this type of formatting for sql names and identifiers, along with regular variable formatting
protects your application from [SQL injection].

Method [as.name] implements the formatting.

#### Alias Filter

An alias is a simpler, less-strict version of `:name` filter, which only supports a text string, i.e.
it does not support `*`, `this`, array or object as inputs, like `:name` does. However, it supports other
popular cases that are less strict, but cover at least 99% of all use cases, as shown below.   

 - It will skip adding surrounding double quotes when the name is a same-case single word:

```js
await db.any('SELECT full_name as $1:alias FROM $2:name', ['name', 'table']);
//=> SELECT full_name as name FROM "table"
```

 - It will automatically split the name into multiple SQL names when encountering `.`, and then
 escape each part separately, thus supporting auto-composite SQL names:

```js
await db.any('SELECT * FROM $1:alias', ['schemaName.table']);
//=> SELECT * FROM "schemaName".table
```

For more details see method [as.alias] that implements the formatting.

### Raw Text

When a variable name ends with `:raw`, or shorter syntax `^`, the value is to be injected as raw text, without escaping.

Such variables cannot be `null` or `undefined`, because of the ambiguous meaning in this case, and those values
will throw error `Values null/undefined cannot be used as raw text.`

```js
const where = pgp.as.format('WHERE price BETWEEN $1 AND $2', [5, 10]); // pre-format WHERE condition
await db.any('SELECT * FROM products $1:raw', where);
//=> SELECT * FROM products WHERE price BETWEEN 5 AND 10
```

Special syntax `this:raw` / `this^` is supported, to inject the formatting object as raw JSON string.

**WARNING:**<br/>
This filter is unsafe, and should not be used for values that come from the client side, as it may result in [SQL injection].

### Open Values

When a variable name ends with `:value`, or shorter syntax `#`, it is escaped as usual, except when its type is a string,
the trailing quotes are not added.

Open values are primarily to be able to compose complete `LIKE`/`ILIKE` dynamic statements in external SQL files,
without having to generate them in the code.

i.e. you can either generate a filter like this in your code:

```js
const name = 'John';
const filter = '%' + name + '%';
```

and then pass it in as a regular string variable, or you can pass in only `name`, and have your query use the
open-value syntax to add the extra search logic:

```sql
SELECT * FROM table WHERE name LIKE '%$1:value%')
```

**WARNING:**<br/>
This filter is unsafe, and should not be used for values that come from the client side, as it may result in [SQL injection].

Method [as.value] implements the formatting.

### JSON Filter

When a variable name ends with `:json`, explicit JSON formatting is applied to the value.

By default, any object that's not `Date`, `Array`, `Buffer`, `null` or Custom-Type (see [Custom Type Formatting]),
is automatically formatted as JSON.

Method [as.json] implements the formatting.

### CSV Filter

When a variable name ends with `:csv` or `:list`, it is formatted as a list of Comma-Separated Values, with each
value formatted according to its JavaScript type.

Typically, you would use this for a value that's an array, though it works for single values also. See the examples below.

<details>
<summary><b>Using :csv filter</b></summary>

```js
const ids = [1, 2, 3];
await db.any('SELECT * FROM table WHERE id IN ($1:csv)', [ids])
//=> SELECT * FROM table WHERE id IN (1,2,3)
```
</details>

<details>
<summary><b>Using :list filter</b></summary>

```js
const ids = [1, 2, 3];
await db.any('SELECT * FROM table WHERE id IN ($1:list)', [ids])
//=> SELECT * FROM table WHERE id IN (1,2,3)
```
</details>
<br/>

Using automatic property enumeration:

<details>
<summary><b>Enumeration with :csv filter</b></summary> 

```js
const obj = {first: 123, second: 'text'};

await db.none('INSERT INTO table($1:name) VALUES($1:csv)', [obj])
//=> INSERT INTO table("first","second") VALUES(123,'text')

await db.none('INSERT INTO table(${this:name}) VALUES(${this:csv})', obj)
//=> INSERT INTO table("first","second") VALUES(123,'text')
```
</details>

<details>
<summary><b>Enumeration with :list filter</b></summary> 

```js
const obj = {first: 123, second: 'text'};

await db.none('INSERT INTO table($1:name) VALUES($1:list)', [obj])
//=> INSERT INTO table("first","second") VALUES(123,'text')

await db.none('INSERT INTO table(${this:name}) VALUES(${this:list})', obj)
//=> INSERT INTO table("first","second") VALUES(123,'text')
```
</details>
<br/>

Method [as.csv] implements the formatting.

## Custom Type Formatting

The library supports dual syntax for _CTF_ (Custom Type Formatting):

* [Explicit CTF] - extending the object/type directly, for ease of use, while changing its signature;
* [Symbolic CTF] - extending the object/type via [Symbol] properties, without changing its signature.

The library always first checks for the [Symbolic CTF], and if no such syntax is used, only then it checks for the [Explicit CTF].

### Explicit CTF

Any value/object that implements function `toPostgres` is treated as a custom-formatting type. The function is then called to get the actual value,
passing it the object via `this` context, and plus as a single parameter (in case `toPostgres` is an ES6 arrow function):

```js
const obj = {
    toPostgres(self) {
        // self = this = obj
        
        // return a value that needs proper escaping
    }
}
```

Function `toPostgres` can return anything, including another object with its own `toPostgres` function, i.e. nested custom types are supported.

The value returned from `toPostgres` is escaped according to its JavaScript type, unless the object also contains property `rawType` set
to a truthy value, in which case the returned value is considered pre-formatted, and thus injected directly, as [Raw Text]:

```js
const obj = {
    toPostgres(self) {
        // self = this = obj
        
        // return a pre-formatted value that does not need escaping
    },
    rawType: true // use result from toPostgres directly, as Raw Text
}
```

Example below implements a class that auto-formats `ST_MakePoint` from coordinates:

```js
class STPoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rawType = true; // no escaping, because we return pre-formatted SQL
    }
    
    toPostgres(self) {
        return pgp.as.format('ST_MakePoint($1, $2)', [this.x, this.y]);
    }
}
```

And a classic syntax for such a class is even simpler:

```js
function STPoint(x, y){
    this.rawType = true; // no escaping, because we return pre-formatted SQL
    this.toPostgres = () => pgp.as.format('ST_MakePoint($1, $2)', [x, y]);
}
```

With this class you can use `new STPoint(12, 34)` as a formatting value that will be injected correctly.  

You can also use _CTF_ to override any standard type:

```js
Date.prototype.toPostgres = a => a.getTime();
```

### Symbolic CTF

The only difference from [Explicit CTF] is that we set `toPostgres` and `rawType` as ES6 [Symbol] properties,
defined in the [ctf] namespace: 

```js
const {toPostgres, rawType} = pgp.as.ctf; // Global CTF symbols

const obj = {
    [toPostgres](self) {
        // self = this = obj
        
        // return a pre-formatted value that does not need escaping
    },
    [rawType]: true // use result from toPostgres directly, as Raw Text
};
```

As CTF symbols are global, you can also configure objects independently of this library:

```js
const ctf = {
    toPostgres: Symbol.for('ctf.toPostgres'),
    rawType: Symbol.for('ctf.rawType')
};
```

Other than that, it works exactly as the [Explicit CTF], but without changing the object's signature.

If you do not know what it means, read the ES6 [Symbol] API and its use for unique property names.
But in short, [Symbol] properties are not enumerated via `for(name in obj)`, i.e. they are not generally
visible within JavaScript, only through specific API `Object.getOwnPropertySymbols`.

## Query Files
  
Use of external SQL files (via [QueryFile]) offers many advantages:

* Much cleaner JavaScript code, with all SQL kept in external files;
* Much easier to write large and well-formatted SQL, with many comments and whole revisions;
* Changes in external SQL can be automatically re-loaded (option `debug`), without restarting the app;
* Pre-formatting SQL upon loading (option `params`), automating two-step SQL formatting;
* Parsing and minifying SQL (options `minify` + `compress`), for early error detection and compact queries.

<details>
<summary><b>Example</b></summary>

```js
const {join: joinPath} = require('path');

// Helper for linking to external query files:
function sql(file) {
    const fullPath = joinPath(__dirname, file);
    return new pgp.QueryFile(fullPath, {minify: true});
}

// Create a QueryFile globally, once per file:
const sqlFindUser = sql('./sql/findUser.sql');

db.one(sqlFindUser, {id: 123})
    .then(user => {
        console.log(user);
    })
    .catch(error => {
        if (error instanceof pgp.errors.QueryFileError) {
            // => the error is related to our QueryFile
        }
    });
```

File `findUser.sql`:

```sql
/*
    multi-line comments are supported
*/
SELECT name, dob -- single-line comments are supported
FROM Users
WHERE id = ${id}
```
</details>
<br/>

Every query method of the library can accept type [QueryFile] as its `query` parameter.
Type [QueryFile] never throws any error, leaving it for query methods to gracefully reject with [QueryFileError].

Use of [Named Parameters] within external SQL files is recommended over the [Index Variables], because it makes the SQL
much easier to read and understand, and because it also allows [Nested Named Parameters], so variables in a large
and complex SQL file can be grouped in namespaces for even easier visual separation.

## Tasks

A [task] represents a shared connection for executing multiple queries:

```js
db.task(t => {
    // execute a chain of queries against the task context, and return the result:
    return t.one('SELECT count(*) FROM events WHERE id = $1', 123, a => +a.count)
        .then(count => {
            if(count > 0) {
                return t.any('SELECT * FROM log WHERE event_id = $1', 123)
                    .then(logs => {
                        return {count, logs};
                    })
            }
            return {count};
        });    
})
    .then(data => {
        // success, data = either {count} or {count, logs}
    })
    .catch(error => {
        // failed    
    });
```

Tasks provide a shared connection context for its callback function, to be released when finished, and
they must be used whenever executing more than one query at a time. See also [Chaining Queries] to understand
the importance of using tasks.

You can optionally tag tasks (see [Tags]), and use ES7 async syntax:

<details>
  <summary><b>With ES7 async</b></summary>
  
```js
db.task(async t => {
    const count = await t.one('SELECT count(*) FROM events WHERE id = $1', 123, a => +a.count);
    if(count > 0) {
        const logs = await t.any('SELECT * FROM log WHERE event_id = $1', 123);
        return {count, logs};
    }
    return {count};
})
    .then(data => {
        // success, data = either {count} or {count, logs}
    })
    .catch(error => {
        // failed    
    });
```

</details>

<details>
  <summary><b>With ES7 async + tag</b></summary>
  
```js
db.task('get-event-logs', async t => {
    const count = await t.one('SELECT count(*) FROM events WHERE id = $1', 123, a => +a.count);
    if(count > 0) {
        const logs = await t.any('SELECT * FROM log WHERE event_id = $1', 123);
        return {count, logs};
    }
    return {count};
})
    .then(data => {
        // success, data = either {count} or {count, logs}
    })
    .catch(error => {
        // failed    
    });
```

</details>

### Conditional Tasks

Method [taskIf] creates a new task only when required, according to the condition. 

The default condition is to start a new task only when necessary, such as on the top level.

<details>
<summary><b>With default condition</b></summary>
 
```js
db.taskIf(t1 => {
    // new task has started, as the top level doesn't have one
    return t1.taskIf(t2 => {
        // Task t1 is being used, according to the default condition
        // t2 = t1
    });
})
```
</details>

<details>
<summary><b>With a custom condition - value</b></summary>
 
```js
db.taskIf({cnd: false}, t1 => {
    // new task is created, i.e. option cnd is ignored here,
    // because the task is required on the top level
    return t1.taskIf({cnd: true}, t2 => {
        // new task created, because we specified that we want one;
        // t2 != t1
    });
})
```
</details>

<details>
<summary><b>With a custom condition - callback</b></summary>
 
```js
const cnd = c => {
    // c.ctx - task/tx context (not available on the top level)
    // default condition: return !c.ctx;
    return someValue;
};

db.taskIf({cnd}, t1 => {
    // new task is always created, because it is required on the top level
    return t1.taskIf({cnd}, t2 => {
        // if someValue is truthy, a new task is created (t2 != t1);
        // otherwise, we continue with the containing task (t2 = t1).
    });
})
```
</details>

## Transactions

Transaction method [tx] is like [task], which also executes `BEGIN` + `COMMIT`/`ROLLBACK`:

```js
db.tx(t => {
    // creating a sequence of transaction queries:
    const q1 = t.none('UPDATE users SET active = $1 WHERE id = $2', [true, 123]);
    const q2 = t.one('INSERT INTO audit(entity, id) VALUES($1, $2) RETURNING id', ['users', 123]);

    // returning a promise that determines a successful transaction:
    return t.batch([q1, q2]); // all of the queries are to be resolved;
})
    .then(data => {
        // success, COMMIT was executed
    })
    .catch(error => {
        // failure, ROLLBACK was executed
    });
```

If the callback function returns a rejected promise or throws an error, the method will automatically execute `ROLLBACK` at the end. 
In all other cases the transaction will be automatically closed by `COMMIT`.

The same as tasks, transactions support [Tags] and ES7 `async`:

<details>
<summary><b>With ES7 async</b></summary>

```js
db.tx(async t => {
    await t.none('UPDATE users SET active = $1 WHERE id = $2', [true, 123]);
    await t.one('INSERT INTO audit(entity, id) VALUES($1, $2) RETURNING id', ['users', 123]);
})
    .then(data => {
        // success, COMMIT was executed
    })
    .catch(error => {
        // failure, ROLLBACK was executed
    });
```

</details>

<details>
<summary><b>With ES7 async + tag</b></summary>

```js
db.tx('update-user', async t => {
    await t.none('UPDATE users SET active = $1 WHERE id = $2', [true, 123]);
    await t.one('INSERT INTO audit(entity, id) VALUES($1, $2) RETURNING id', ['users', 123]);
})
    .then(data => {
        // success, COMMIT was executed
    })
    .catch(error => {
        // failure, ROLLBACK was executed
    });
```

</details>

### Nested Transactions

Nested transactions automatically share the connection between all levels.
This library sets no limitation as to the depth (nesting levels) of transactions supported.

<details>
<summary><b>Example</b></summary>

```js
db.tx(t => {
    const queries = [
        t.none('DROP TABLE users;'),
        t.none('CREATE TABLE users(id SERIAL NOT NULL, name TEXT NOT NULL)')
    ];
    for (let i = 1; i <= 100; i++) {
        queries.push(t.none('INSERT INTO users(name) VALUES($1)', 'name-' + i));
    }
    queries.push(
        t.tx(t1 => {
            return t1.tx(t2 => {
                return t2.one('SELECT count(*) FROM users');
            });
        }));
    return t.batch(queries);
})
    .then(data => {
        // success
    })
    .catch(error => {
        // failure
    });
```
</details>
<br/>

If you want to avoid automatic occurrence of nested transactions, see [Conditional Transactions].

#### Limitations

It is important to know that PostgreSQL does not support full/atomic nested transactions, it only
supports [savepoints](http://www.postgresql.org/docs/9.6/static/sql-savepoint.html) inside top-level
transactions, to allow *partial rollbacks*.

Postgres uses `BEGIN` with `COMMIT / ROLLBACK` for top-level transactions, and `SAVEPOINT name`
with `RELEASE / ROLLBACK TO name` for inner save-points.

This library automatically executes all such transaction and savepoint commands, with unique
savepoint names, based on the transaction level, plus index within the current level, in the
form of `sp_x_y`.

In the name, `x` is the transaction level, starting with `1` (because `0` is the top-level
transaction that does not use savepoints). And `y` represents sub-transaction order/index
within the current level, starting with `1`. So the first savepoint on the top level will
be named `sp_1_1`.

### Configurable Transactions

[TransactionMode] type can extend your `BEGIN` command with transaction configuration:

```js
const {TransactionMode, isolationLevel} = pgp.txMode;
 
// Create a reusable transaction mode (serializable + read-only + deferrable):
const mode = new TransactionMode({
    tiLevel: isolationLevel.serializable,
    readOnly: true,
    deferrable: true
});

db.tx({mode}, t => {
    // do transaction queries here
})
    .then(() => {
        // success;
    })
    .catch(error => {
        // failure    
    });
```

Instead of the default `BEGIN`, such transaction will open with the following command:
```
BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE
```

_Transaction Mode_ is set via option `mode`, preceding the callback function. See methods [tx] and [txIf].

This is the most efficient and best-performing way of configuring transactions. In combination with
*Transaction Snapshots* you can make the most out of transactions in terms of performance and concurrency.

### Conditional Transactions

Method [txIf] executes a transaction / [tx] when a specified condition is met, or else it executes a [task]. 

When no condition is specified, the default is to start a transaction, if currently not in one, or else it starts a task.
It is useful when you want to avoid [Nested Transactions] - savepoints.

<details>
<summary><b>With default condition</b></summary>
 
```js
db.txIf(t => {
    // transaction is started, as the top level doesn't have one
    return t.txIf(t2 => {
        // a task is started, because there is a parent transaction        
    });
})
```
</details>

<details>
<summary><b>With a custom condition - value</b></summary>

```js
db.txIf({cnd: someValue}, t => {
    // if condition is truthy, a transaction is started
    return t.txIf(t2 => {
        // a task is started, if the parent is a transaction
        // a transaction is started, if the parent is a task
    });
})
```
</details>

<details>
<summary><b>With a custom condition - callback</b></summary>

```js
const cnd = c => {
    // c.ctx - task/transaction context (not available on the top level)
    // default condition: return !c.ctx || !c.ctx.inTransaction;
    return someValue;
};

db.txIf({cnd}, t => {
    // if condition is truthy, a transaction is started
    return t.txIf(t2 => {
        // a task is started, if the parent is a transaction
        // a transaction is started, if the parent is a task
    });
})
```
</details>

## Library de-initialization

This library manages all database connections via the [connection pool], which internally caches them.

Connections in the cache expire due to inactivity after [idleTimeoutMillis] number of milliseconds, which you
can set only when creating the [Database] object. 

While there is a single open connection in the pool, the process cannot terminate by itself, only via `process.exit()`,
unless `allowExitOnIdle` is used - see update section below.
If you want the process to finish by itself, without waiting for all connections in the pool to expire, you need
to force the pool to shut down all the connections it holds:

```js
db.$pool.end(); // shuts down the connection pool associated with the Database object
``` 

For example, if you are using the [Bluebird] library, you can chain the last promise in the process like this:

```js
.finally(db.$pool.end);
``` 

**IMPORTANT:** Note that if your app is an HTTP service, or generally an application that does not feature any exit point,
then you should not do any de-initialization at all. It is only if your app is a run-through process/utility, then you
might want to use it, so the process ends without delays.  

In applications that either use multiple databases or execute a multi-pool strategy for balanced query loads, you would end up
with multiple [Database] objects, each with its own connection pool. In this scenario, in order to exit the process normally,
at a particular point, you can call [pgp.end] to shut down all connection pools at once:

```js
pgp.end(); // shuts down all connection pools created in the process
```

or promise-chained to the last query block in the process:

```js
.finally(pgp.end);
``` 

Once you have shut down the pool associated with your [Database] object, you can no longer use the object, and any of its query methods
will be rejecting with [Error] = `Connection pool of the database object has been destroyed`.

See the relevant API: [pgp.end], [Database.$pool]

<!-- Internal Menu Links -->

[Usage]:#usage
[Index Variables]:#index-variables  
[Named Parameters]:#named-parameters
[Nested Named Parameters]:#nested-named-parameters
[SQL Names]:#sql-names
[Raw Text]:#raw-text
[Open Values]:#open-values
[Alias Filter]:#alias-filter
[JSON Filter]:#json-filter
[CSV Filter]:#csv-filter
[Custom Type Formatting]:#custom-type-formatting
[Explicit CTF]:#explicit-ctf
[Symbolic CTF]:#symbolic-ctf
[Tasks]:#tasks    
[Transactions]:#transactions
[Nested Transactions]:#nested-transactions    
[Limitations]:#limitations   
[Configurable Transactions]:#configurable-transactions
[Conditional Tasks]:#conditional-tasks
[Conditional Transactions]:#conditional-transactions  
[Library de-initialization]:#library-de-initialization
[Query Files]:#query-files

<!-- Internal Page Links -->

[Contribution Notes]:.github/CONTRIBUTING.md
[CHANGELOG]:.github/CHANGELOG.md

<!-- Database Method Links -->

[query]:https://vitaly-t.github.io/pg-promise/Database.html#query
[none]:https://vitaly-t.github.io/pg-promise/Database.html#none
[one]:https://vitaly-t.github.io/pg-promise/Database.html#one
[oneOrNone]:https://vitaly-t.github.io/pg-promise/Database.html#oneOrNone
[many]:https://vitaly-t.github.io/pg-promise/Database.html#many
[manyOrNone]:https://vitaly-t.github.io/pg-promise/Database.html#manyOrNone
[any]:https://vitaly-t.github.io/pg-promise/Database.html#any
[result]:https://vitaly-t.github.io/pg-promise/Database.html#result
[multi]:https://vitaly-t.github.io/pg-promise/Database.html#multi
[multiResult]:https://vitaly-t.github.io/pg-promise/Database.html#multiResult
[map]:https://vitaly-t.github.io/pg-promise/Database.html#map
[each]:https://vitaly-t.github.io/pg-promise/Database.html#each
[func]:https://vitaly-t.github.io/pg-promise/Database.html#func
[proc]:https://vitaly-t.github.io/pg-promise/Database.html#proc
[stream]:https://vitaly-t.github.io/pg-promise/Database.html#stream
[connect]:https://vitaly-t.github.io/pg-promise/Database.html#connect
[task]:https://vitaly-t.github.io/pg-promise/Database.html#task
[taskIf]:https://vitaly-t.github.io/pg-promise/Database.html#taskIf
[tx]:https://vitaly-t.github.io/pg-promise/Database.html#tx
[txIf]:https://vitaly-t.github.io/pg-promise/Database.html#txIf
[batch]:https://vitaly-t.github.io/pg-promise/Task.html#batch
[sequence]:https://vitaly-t.github.io/pg-promise/Task.html#sequence
[page]:https://vitaly-t.github.io/pg-promise/Task.html#page
[extend]:https://vitaly-t.github.io/pg-promise/global.html#event:extend

<!-- API Links -->

[Official Documentation]:https://vitaly-t.github.io/pg-promise/index.html
[Initialization Options]:https://vitaly-t.github.io/pg-promise/module-pg-promise.html
[helpers]:https://vitaly-t.github.io/pg-promise/helpers.html
[QueryFile]:https://vitaly-t.github.io/pg-promise/QueryFile.html
[QueryFileError]:https://vitaly-t.github.io/pg-promise/errors.QueryFileError.html
[Database]:https://vitaly-t.github.io/pg-promise/Database.html
[Database.$pool]:https://vitaly-t.github.io/pg-promise/Database.html#$pool
[pgp.end]:https://vitaly-t.github.io/pg-promise/module-pg-promise.html#~end
[formatting]:https://vitaly-t.github.io/pg-promise/formatting.html
[ctf]:https://vitaly-t.github.io/pg-promise/formatting.ctf.html
[as.format]:https://vitaly-t.github.io/pg-promise/formatting.html#.format
[format]:https://vitaly-t.github.io/pg-promise/formatting.html#.format
[as.value]:https://vitaly-t.github.io/pg-promise/formatting.html#.value
[as.csv]:https://vitaly-t.github.io/pg-promise/formatting.html#.csv
[as.json]:https://vitaly-t.github.io/pg-promise/formatting.html#.json
[as.name]:https://vitaly-t.github.io/pg-promise/formatting.html#.name
[as.alias]:https://vitaly-t.github.io/pg-promise/formatting.html#.alias
[TransactionMode]:https://vitaly-t.github.io/pg-promise/txMode.TransactionMode.html
[PreparedStatement]:https://vitaly-t.github.io/pg-promise/PreparedStatement.html
[ParameterizedQuery]:https://vitaly-t.github.io/pg-promise/ParameterizedQuery.html

<!-- WiKi Links -->

[Learn by Example]:https://github.com/vitaly-t/pg-promise/wiki/Learn-by-Example
[Chaining Queries]:https://github.com/vitaly-t/pg-promise/wiki/Chaining-Queries
[Tags]:https://github.com/vitaly-t/pg-promise/wiki/Tags

<!-- External Links -->

[node-postgres]:https://github.com/brianc/node-postgres
[Bluebird]:https://github.com/petkaantonov/bluebird
[SQL injection]:https://en.wikipedia.org/wiki/SQL_injection
[Symbol]:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
[idleTimeoutMillis]:https://github.com/brianc/node-postgres/blob/master/packages/pg/lib/defaults.js
[connection pool]:https://github.com/brianc/node-postgres/tree/master/packages/pg-pool
[Error]:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
