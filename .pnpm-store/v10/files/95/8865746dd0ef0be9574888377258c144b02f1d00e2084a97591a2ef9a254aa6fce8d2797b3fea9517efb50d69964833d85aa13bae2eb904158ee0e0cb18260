# SQL Escaper

[![NPM Version](https://img.shields.io/npm/v/sql-escaper.svg?label=&color=70a1ff&logo=npm&logoColor=white)](https://www.npmjs.com/package/sql-escaper)
[![NPM Downloads](https://img.shields.io/npm/dm/sql-escaper.svg?label=&logo=npm&logoColor=white&color=45aaf2)](https://www.npmjs.com/package/sql-escaper)
[![Coverage](https://img.shields.io/codecov/c/github/mysqljs/sql-escaper?label=&logo=codecov&logoColor=white&color=98cc00)](https://app.codecov.io/gh/mysqljs/sql-escaper)<br />
[![GitHub Workflow Status (Node.js)](https://img.shields.io/github/actions/workflow/status/mysqljs/sql-escaper/ci_node.yml?event=push&label=&branch=main&logo=nodedotjs&logoColor=535c68&color=badc58)](https://github.com/mysqljs/sql-escaper/actions/workflows/ci_node.yml?query=branch%3Amain)
[![GitHub Workflow Status (Bun)](https://img.shields.io/github/actions/workflow/status/mysqljs/sql-escaper/ci_bun.yml?event=push&label=&branch=main&logo=bun&logoColor=ffffff&color=f368e0)](https://github.com/mysqljs/sql-escaper/actions/workflows/ci_bun.yml?query=branch%3Amain)
[![GitHub Workflow Status (Deno)](https://img.shields.io/github/actions/workflow/status/mysqljs/sql-escaper/ci_deno.yml?event=push&label=&branch=main&logo=deno&logoColor=ffffff&color=079992)](https://github.com/mysqljs/sql-escaper/actions/workflows/ci_deno.yml?query=branch%3Amain)

## Motivation

**SQL Escaper** is a rework of [**sqlstring**](https://github.com/mysqljs/sqlstring) (created by [**Douglas Wilson**](https://github.com/dougwilson)), by using an **AST**-based approach to parse and format SQL queries while maintaining its same API.

### Rework includes:

- **TypeScript** by default.
- Support for `Uint8Array` and `BigInt`.
- Support for both **CJS** and **ESM** exports.
- Up to [**~40% faster**](#performance) compared to **sqlstring**.
- Distinguishes when a keyword is used as value.
- Distinguishes when a column has a keyword name.
- Distinguishes between multiple clauses/keywords in the same query.
- Reasonable conservative support for **Node.js v12** _(**sqlstring** supports **Node.js v0.6**)_.

> [!TIP]
>
> **SQL Escaper** has the same API as the original [**sqlstring**](https://github.com/mysqljs/sqlstring), so it can be used as a drop-in replacement. If **SQL Escaper** breaks any **API** usage compared to **sqlstring**, please, report it as a bug. [Pull Requests are welcome](./CONTRIBUTING.md).

> [!IMPORTANT]
>
> 🔐 **SQL Escaper** is intended to fix a potential [**SQL Injection vulnerability**](https://flattsecurity.medium.com/finding-an-unseen-sql-injection-by-bypassing-escape-functions-in-mysqljs-mysql-90b27f6542b4) reported in 2022. By combining the original [**sqlstring**](https://github.com/mysqljs/sqlstring) with [**mysqljs/mysql**](https://github.com/mysqljs/mysql) or [**MySQL2**](https://github.com/sidorares/node-mysql2), objects passed as values could be expanded into **SQL** fragments, potentially allowing attackers to manipulate query structure. See [sidorares/node-mysql2#4051](https://github.com/sidorares/node-mysql2/issues/4051) for details.
>
> Regardless of the `stringifyObjects` value, objects used outside of `SET` or `ON DUPLICATE KEY UPDATE` contexts are always stringified as `'[object Object]'`. This is a security measure to prevent [SQL Injection](https://flattsecurity.medium.com/finding-an-unseen-sql-injection-by-bypassing-escape-functions-in-mysqljs-mysql-90b27f6542b4) and is not interpreted as a breaking change for **sqlstring** usage.

---

## Install

```bash
# Node.js
npm i sql-escaper
```

```bash
# Bun
bun add sql-escaper
```

```bash
# Deno
deno add npm:sql-escaper
```

---

### [MySQL2](https://github.com/sidorares/node-mysql2)

For **MySQL2**, it already uses **SQL Escaper** as its default escaping library since version `3.17.0`, so you just need to update it to the latest version:

```bash
npm i mysql2@latest
```

### [mysqljs/mysql](https://github.com/mysqljs/mysql)

You can use an overrides in your _package.json_:

```json
"dependencies": {
  "mysql": "^2.18.1"
},
"overrides": {
  "sqlstring": "npm:sql-escaper"
}
```

- Next, clean the `node_modules` and reinstall the dependencies (`npm i`).
- Please, note the minimum supported version of **Node.js** is `12`.

---

## Usage

For _up-to-date_ documentation, always follow the [**README.md**](https://github.com/mysqljs/sql-escaper?tab=readme-ov-file#readme) in the **GitHub** repository.

### Quickstart

```js
import { escape, escapeId, format, raw } from 'sql-escaper';

escape("Hello 'World'");
// => "'Hello \\'World\\''"

escapeId('table.column');
// => '`table`.`column`'

format('SELECT * FROM ?? WHERE id = ?', ['users', 42]);
// => 'SELECT * FROM `users` WHERE id = 42'

format('INSERT INTO users SET ?', [{ name: 'foo', email: 'bar@test.com' }]);
// => "INSERT INTO users SET `name` = 'foo', `email` = 'bar@test.com'"

escape(raw('NOW()'));
// => 'NOW()'
```

### Import

#### ES Modules

```js
import { escape, escapeId, format, raw } from 'sql-escaper';
```

#### CommonJS

```js
const { escape, escapeId, format, raw } = require('sql-escaper');
```

---

## API

### escape

Escapes a value for safe use in SQL queries.

```ts
escape(value: SqlValue, stringifyObjects?: boolean, timezone?: Timezone): string
```

```js
escape(undefined); // 'NULL'
escape(null); // 'NULL'
escape(true); // 'true'
escape(false); // 'false'
escape(5); // '5'
escape("Hello 'World"); // "'Hello \\'World'"
```

#### Dates

Dates are converted to `YYYY-MM-DD HH:mm:ss.sss` format:

```js
escape(new Date(2012, 4, 7, 11, 42, 3, 2));
// => "'2012-05-07 11:42:03.002'"
```

Invalid dates return `NULL`:

```js
escape(new Date(NaN)); // 'NULL'
```

You can specify a timezone:

```js
const date = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));

escape(date, false, 'Z'); // "'2012-05-07 11:42:03.002'"
escape(date, false, '+01'); // "'2012-05-07 12:42:03.002'"
escape(date, false, '-05:00'); // "'2012-05-07 06:42:03.002'"
```

#### Buffers

Buffers are converted to hex strings:

```js
escape(Buffer.from([0, 1, 254, 255]));
// => "X'0001feff'"
```

#### Objects

Objects with a `toSqlString` method will have that method called:

```js
escape({ toSqlString: () => 'NOW()' });
// => 'NOW()'
```

Plain objects are converted to `key = value` pairs:

```js
escape({ a: 'b', c: 'd' });
// => "`a` = 'b', `c` = 'd'"
```

Function properties in objects are ignored:

```js
escape({ a: 'b', c: () => {} });
// => "`a` = 'b'"
```

When `stringifyObjects` is set to a non-nullish value, objects are stringified instead of being expanded into key-value pairs:

```js
escape({ a: 'b' }, true);
// => "'[object Object]'"
```

#### Arrays

Arrays are turned into comma-separated lists:

```js
escape([1, 2, 'c']);
// => "1, 2, 'c'"
```

Nested arrays are turned into grouped lists (useful for bulk inserts):

```js
escape([
  [1, 2, 3],
  [4, 5, 6],
]);
// => '(1, 2, 3), (4, 5, 6)'
```

---

### escapeId

Escapes an identifier (database, table, or column name).

```ts
escapeId(value: SqlValue, forbidQualified?: boolean): string
```

```js
escapeId('id');
// => '`id`'

escapeId('table.column');
// => '`table`.`column`'

escapeId('i`d');
// => '`i``d`'
```

Qualified identifiers (with `.`) can be forbidden:

```js
escapeId('id1.id2', true);
// => '`id1.id2`'
```

Arrays are turned into comma-separated identifier lists:

```js
escapeId(['a', 'b', 't.c']);
// => '`a`, `b`, `t`.`c`'
```

---

### format

Formats a SQL query by replacing `?` placeholders with escaped values and `??` with escaped identifiers.

```ts
format(sql: string, values?: SqlValue | SqlValue[], stringifyObjects?: boolean, timezone?: Timezone): string
```

```js
format('SELECT * FROM ?? WHERE id = ?', ['users', 42]);
// => 'SELECT * FROM `users` WHERE id = 42'

format('? and ?', ['a', 'b']);
// => "'a' and 'b'"
```

Triple (or more) question marks are ignored:

```js
format('? or ??? and ?', ['foo', 'bar', 'fizz', 'buzz']);
// => "'foo' or ??? and 'bar'"
```

If no values are provided, the SQL is returned unchanged:

```js
format('SELECT ??');
// => 'SELECT ??'
```

#### Objects in SET clauses

When `stringifyObjects` is falsy, objects used in `SET` or `ON DUPLICATE KEY UPDATE` contexts are automatically expanded into `key = value` pairs:

```js
format('UPDATE users SET ?', [{ name: 'foo', email: 'bar@test.com' }]);
// => "UPDATE users SET `name` = 'foo', `email` = 'bar@test.com'"

format(
  'INSERT INTO users (name, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE ?',
  ['foo', 'bar@test.com', { name: 'foo', email: 'bar@test.com' }]
);
// => "INSERT INTO users (name, email) VALUES ('foo', 'bar@test.com') ON DUPLICATE KEY UPDATE `name` = 'foo', `email` = 'bar@test.com'"
```

When `stringifyObjects` is truthy, objects are always stringified:

```js
format('UPDATE users SET ?', [{ name: 'foo' }], true);
// => "UPDATE users SET '[object Object]'"
```

---

### raw

Creates a raw SQL value that will not be escaped.

```ts
raw(sql: string): Raw
```

```js
escape(raw('NOW()'));
// => 'NOW()'

escape({ id: raw('LAST_INSERT_ID()') });
// => '`id` = LAST_INSERT_ID()'
```

Only accepts strings:

```js
raw(42); // throws TypeError
```

---

### TypeScript

You can import the available types:

```ts
import type { Raw, SqlValue, Timezone } from 'sql-escaper';
```

---

## Performance

Each benchmark formats `10,000` queries using `format` with `100` mixed values (numbers, strings, `null`, and dates), comparing **SQL Escaper** against the original [**sqlstring**](https://github.com/mysqljs/sqlstring) through [**hyperfine**](https://github.com/sharkdp/hyperfine):

| Benchmark                                | sqlstring | SQL Escaper |       Difference |
| ---------------------------------------- | --------: | ----------: | ---------------: |
| Select 100 values                        |  248.8 ms |    178.7 ms | **1.39x faster** |
| Insert 100 values                        |  247.5 ms |    196.2 ms | **1.26x faster** |
| SET with 100 values                      |  257.5 ms |    205.2 ms | **1.26x faster** |
| SET with 100 objects                     |  348.3 ms |    250.5 ms | **1.39x faster** |
| ON DUPLICATE KEY UPDATE with 100 values  |  466.2 ms |    394.6 ms | **1.18x faster** |
| ON DUPLICATE KEY UPDATE with 100 objects |  558.2 ms |    433.9 ms | **1.29x faster** |

- See detailed results and how the benchmarks are run in the [**benchmark**](https://github.com/mysqljs/sql-escaper/tree/main/benchmark) directory.

> [!NOTE]
>
> Benchmarks ran on [**GitHub Actions**](https://github.com/mysqljs/sql-escaper/blob/main/.github/workflows/ci_benchmark.yml) (`ubuntu-latest`) using **Node.js LTS**.
> Results may vary depending on runner hardware and runtime version.

---

## Differences from sqlstring

- Requires **Node.js 12+** (the original [**sqlstring**](https://github.com/mysqljs/sqlstring) supports **Node.js** 0.6+)

> [!TIP]
>
> The Node.js 12+ requirement is what allows **SQL Escaper** to leverage modern engine optimizations and achieve the [performance gains](#performance) over the original.

---

## Caution

> Based on the original [**sqlstring** documentation](https://github.com/mysqljs/sqlstring#readme).

- The escaping methods in this library only work when the [`NO_BACKSLASH_ESCAPES`](https://dev.mysql.com/doc/refman/5.7/en/sql-mode.html#sqlmode_no_backslash_escapes) SQL mode is disabled (which is the default state for MySQL servers).

- This library performs **client-side escaping** to generate SQL strings. The syntax for `format` may look similar to a prepared statement, but it is not — the escaping rules from this module are used to produce the resulting SQL string.

- When using `format`, **all** `?` placeholders are replaced, including those contained in comments and strings.

- When structured user input is provided as the value to escape, care should be taken to validate the shape of the input, as the resulting escaped string may contain more than a single value.

- `NaN` and `Infinity` are left as-is. MySQL does not support these values, and trying to insert them will trigger MySQL errors.

- The string provided to `raw()` will **skip all escaping**, so be careful when passing in unvalidated input.

---

## Security Policy

[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/mysqljs/sql-escaper/ci_codeql.yml?event=push&label=&branch=main&logo=github&logoColor=white&color=f368e0)](https://github.com/mysqljs/sql-escaper/actions/workflows/ci_codeql.yml?query=branch%3Amain)

Please check the [**SECURITY.md**](https://github.com/mysqljs/sql-escaper/blob/main/SECURITY.md).

---

## Contributing

See the [**Contributing Guide**](https://github.com/mysqljs/sql-escaper/blob/main/CONTRIBUTING.md) and please follow our [**Code of Conduct**](https://github.com/mysqljs/sql-escaper/blob/main/CODE_OF_CONDUCT.md) 🚀

---

## Acknowledgements

- [![Contributors](https://img.shields.io/github/contributors/mysqljs/sql-escaper?label=Contributors)](https://github.com/mysqljs/sql-escaper/graphs/contributors)
- **SQL Escaper** is adapted from [**sqlstring**](https://github.com/mysqljs/sqlstring) ([**MIT**](https://github.com/mysqljs/sqlstring/blob/master/LICENSE)), modernizing it with high performance, TypeScript support and multi-runtime compatibility.
- Special thanks to [**Douglas Wilson**](https://github.com/dougwilson) for the original **sqlstring** project and its [**contributors**](https://github.com/mysqljs/sqlstring/graphs/contributors).

---

## License

**SQL Escaper** is under the [**MIT License**](https://github.com/mysqljs/sql-escaper/blob/main/LICENSE).
