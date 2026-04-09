# Hrana client for TypeScript

**[API docs][docs] | [Github][github] | [npm][npm]**

[docs]: https://libsql.org/hrana-client-ts/
[github]: https://github.com/libsql/hrana-client-ts/
[npm]: https://www.npmjs.com/package/@libsql/hrana-client

This package implements a Hrana client for TypeScript. Hrana is the protocol for connecting to sqld using WebSocket or HTTP.

> This package is intended mostly for internal use. Consider using the [`@libsql/client`][libsql-client] package, which will use Hrana automatically.

[libsql-client]: https://www.npmjs.com/package/@libsql/client

## Usage

```typescript
import * as hrana from "@libsql/hrana-client";

// Open a `hrana.Client`, which works like a connection pool in standard SQL
// databases. 
const url = process.env.URL ?? "ws://localhost:8080"; // Address of the sqld server
const jwt = process.env.JWT; // JWT token for authentication
// Here we are using Hrana over WebSocket:
const client = hrana.openWs(url, jwt);
// But we can also use Hrana over HTTP:
// const client = hrana.openHttp(url, jwt);

// Open a `hrana.Stream`, which is an interactive SQL stream. This corresponds
// to a "connection" from other SQL databases
const stream = client.openStream();

// Fetch all rows returned by a SQL statement
const books = await stream.query("SELECT title, year FROM book WHERE author = 'Jane Austen'");
// The rows are returned in an Array...
for (const book of books.rows) {
    // every returned row works as an array (`book[1]`) and as an object (`book.year`)
    console.log(`${book.title} from ${book.year}`);
}

// Fetch a single row
const book = await stream.queryRow("SELECT title, MIN(year) FROM book");
if (book.row !== undefined) {
    console.log(`The oldest book is ${book.row.title} from year ${book.row[1]}`);
}

// Fetch a single value, using a bound parameter
const year = await stream.queryValue(["SELECT MAX(year) FROM book WHERE author = ?", ["Jane Austen"]]);
if (year.value !== undefined) {
    console.log(`Last book from Jane Austen was published in ${year.value}`);
}

// Execute a statement that does not return any rows
const res = await stream.run(["DELETE FROM book WHERE author = ?", ["J. K. Rowling"]])
console.log(`${res.affectedRowCount} books have been cancelled`);

// When you are done, remember to close the client
client.close();
```
