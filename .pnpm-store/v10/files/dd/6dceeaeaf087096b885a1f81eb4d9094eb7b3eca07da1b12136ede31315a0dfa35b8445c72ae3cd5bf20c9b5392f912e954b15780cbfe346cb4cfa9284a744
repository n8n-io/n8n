# node-mssql

Microsoft SQL Server client for Node.js

[![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![Appveyor CI][appveyor-image]][appveyor-url] [![Join the chat at https://gitter.im/patriksimek/node-mssql](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/patriksimek/node-mssql?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Supported TDS drivers:
- [Tedious][tedious-url] (pure JavaScript - Windows/macOS/Linux, default)
- [Microsoft / Contributors Node V8 Driver for Node.js for SQL Server][msnodesqlv8-url] (v2 native - Windows or Linux/macOS 64 bits only)

## Installation

    npm install mssql

## Short Example: Use Connect String

```javascript
const sql = require('mssql')

async () => {
    try {
        // make sure that any items are correctly URL encoded in the connection string
        await sql.connect('Server=localhost,1433;Database=database;User Id=username;Password=password;Encrypt=true')
        const result = await sql.query`select * from mytable where id = ${value}`
        console.dir(result)
    } catch (err) {
        // ... error checks
    }
}
```

If you're on Windows Azure, add `?encrypt=true` to your connection string. See [docs](#configuration) to learn more.

Parts of the connection URI should be correctly URL encoded so that the URI can be parsed correctly.

## Longer Example: Connect via Config Object

Assuming you have set the appropriate environment variables, you can construct a config object as follows:

```javascript
const sql = require('mssql')
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME,
  server: 'localhost',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: false // change to true for local dev / self-signed certs
  }
}

async () => {
 try {
  // make sure that any items are correctly URL encoded in the connection string
  await sql.connect(sqlConfig)
  const result = await sql.query`select * from mytable where id = ${value}`
  console.dir(result)
 } catch (err) {
  // ... error checks
 }
}
```

## Documentation

### Examples

* [Async/Await](#asyncawait)
* [Promises](#promises)
* [ES6 Tagged template literals](#es6-tagged-template-literals)
* [Callbacks](#callbacks)
* [Streaming](#streaming)
* [Connection Pools](#connection-pools)

### Configuration

* [General](#general-same-for-all-drivers)
* [Formats](#formats)

### Drivers

* [Tedious](#tedious)
* [Microsoft / Contributors Node V8 Driver for Node.js for SQL Server](#microsoft--contributors-node-v8-driver-for-nodejs-for-sql-server)

### Connections

* [Pool Management](#pool-management)
* [ConnectionPool](#connections-1)
* [connect](#connect-callback)
* [close](#close)

### Requests

* [Request](#request)
* [execute](#execute-procedure-callback)
* [input](#input-name-type-value)
* [output](#output-name-type-value)
* [toReadableStream](#toReadableStream)
* [pipe](#pipe-stream)
* [query](#query-command-callback)
* [batch](#batch-batch-callback)
* [bulk](#bulk-table-options-callback)
* [cancel](#cancel)

### Transactions

* [Transaction](#transaction)
* [begin](#begin-isolationlevel-callback)
* [commit](#commit-callback)
* [rollback](#rollback-callback)

### Prepared Statements

* [PreparedStatement](#prepared-statement)
* [input](#input-name-type)
* [output](#output-name-type)
* [prepare](#prepare-statement-callback)
* [execute](#execute-values-callback)
* [unprepare](#unprepare-callback)

### Other

* [CLI](#cli)
* [Geography and Geometry](#geography-and-geometry)
* [Table-Valued Parameter](#table-valued-parameter-tvp)
* [Response Schema](#response-schema)
* [Affected Rows](#affected-rows)
* [JSON support](#json-support)
* [Handling Duplicate Column Names](#handling-duplicate-column-names)
* [Errors](#errors)
* [Informational messages](#informational-messages)
* [Metadata](#metadata)
* [Data Types](#data-types)
* [SQL injection](#sql-injection)
* [Known Issues](#known-issues)
* [Contributing](https://github.com/tediousjs/node-mssql/wiki/Contributing)
* [8.x to 9.x changes](#8x-to-9x-changes)
* [7.x to 8.x changes](#7x-to-8x-changes)
* [6.x to 7.x changes](#6x-to-7x-changes)
* [5.x to 6.x changes](#5x-to-6x-changes)
* [4.x to 5.x changes](#4x-to-5x-changes)
* [3.x to 4.x changes](#3x-to-4x-changes)
* [3.x Documentation](https://github.com/tediousjs/node-mssql/blob/1893969195045a250f0fdeeb2de7f30dcf6689ad/README.md)

## Examples

### Config

```javascript
const config = {
    user: '...',
    password: '...',
    server: 'localhost', // You can use 'localhost\\instance' to connect to named instance
    database: '...',
}
```


### Async/Await

```javascript
const sql = require('mssql')

(async function () {
    try {
        let pool = await sql.connect(config)
        let result1 = await pool.request()
            .input('input_parameter', sql.Int, value)
            .query('select * from mytable where id = @input_parameter')
            
        console.dir(result1)
    
        // Stored procedure
        
        let result2 = await pool.request()
            .input('input_parameter', sql.Int, value)
            .output('output_parameter', sql.VarChar(50))
            .execute('procedure_name')
        
        console.dir(result2)
    } catch (err) {
        // ... error checks
    }
})()

sql.on('error', err => {
    // ... error handler
})
```

### Promises

#### Queries

```javascript
const sql = require('mssql')

sql.on('error', err => {
    // ... error handler
})

sql.connect(config).then(pool => {
    // Query
    
    return pool.request()
        .input('input_parameter', sql.Int, value)
        .query('select * from mytable where id = @input_parameter')
}).then(result => {
    console.dir(result)
}).catch(err => {
  // ... error checks
});
```

#### Stored procedures

```js
const sql = require('mssql')

sql.on('error', err => {
    // ... error handler
})

sql.connect(config).then(pool => {
    
    // Stored procedure
    
    return pool.request()
        .input('input_parameter', sql.Int, value)
        .output('output_parameter', sql.VarChar(50))
        .execute('procedure_name')
}).then(result => {
    console.dir(result)
}).catch(err => {
    // ... error checks
})
```

Native Promise is used by default. You can easily change this with `sql.Promise = require('myownpromisepackage')`.

### ES6 Tagged template literals

```javascript
const sql = require('mssql')

sql.connect(config).then(() => {
    return sql.query`select * from mytable where id = ${value}`
}).then(result => {
    console.dir(result)
}).catch(err => {
    // ... error checks
})

sql.on('error', err => {
    // ... error handler
})
```

All values are automatically sanitized against sql injection. 
This is because it is rendered as prepared statement, and thus all limitations imposed in MS SQL on parameters apply.
e.g. Column names cannot be passed/set in statements using variables.

### Callbacks

```javascript
const sql = require('mssql')

sql.connect(config, err => {
    // ... error checks

    // Query

    new sql.Request().query('select 1 as number', (err, result) => {
        // ... error checks

        console.dir(result)
    })

    // Stored Procedure

    new sql.Request()
    .input('input_parameter', sql.Int, value)
    .output('output_parameter', sql.VarChar(50))
    .execute('procedure_name', (err, result) => {
        // ... error checks

        console.dir(result)
    })

    // Using template literal

    const request = new sql.Request()
    request.query(request.template`select * from mytable where id = ${value}`, (err, result) => {
        // ... error checks
        console.dir(result)
    })
})

sql.on('error', err => {
    // ... error handler
})
```

### Streaming

If you plan to work with large amount of rows, you should always use streaming. Once you enable this, you must listen for events to receive data.

```javascript
const sql = require('mssql')

sql.connect(config, err => {
    // ... error checks

    const request = new sql.Request()
    request.stream = true // You can set streaming differently for each request
    request.query('select * from verylargetable') // or request.execute(procedure)

    request.on('recordset', columns => {
        // Emitted once for each recordset in a query
    })

    request.on('row', row => {
        // Emitted for each row in a recordset
    })

    request.on('rowsaffected', rowCount => {
        // Emitted for each `INSERT`, `UPDATE` or `DELETE` statement
        // Requires NOCOUNT to be OFF (default)
    })

    request.on('error', err => {
        // May be emitted multiple times
    })

    request.on('done', result => {
        // Always emitted as the last one
    })
})

sql.on('error', err => {
    // ... error handler
})
```

When streaming large sets of data you want to back-off or chunk the amount of data you're processing
 to prevent memory exhaustion issues; you can use the `Request.pause()` function to do this. Here is
 an example of managing rows in batches of 15:

```javascript
let rowsToProcess = [];
request.on('row', row => {
  rowsToProcess.push(row);
  if (rowsToProcess.length >= 15) {
    request.pause();
    processRows();
  }
});
request.on('done', () => {
    processRows();
});

function processRows() {
  // process rows
  rowsToProcess = [];
  request.resume();
}
```

## Connection Pools

An important concept to understand when using this library is [Connection Pooling](https://en.wikipedia.org/wiki/Connection_pool) as this library uses connection pooling extensively. As one Node JS process is able to handle multiple requests at once, we can take advantage of this long running process to create a pool of database connections for reuse; this saves overhead of connecting to the database for each request
(as would be the case in something like PHP, where one process handles one request).

With the advantages of pooling comes some added complexities, but these are mostly just conceptual and once you understand how the pooling is working, it is simple to make use of it efficiently and effectively.

### The Global Connection Pool

To assist with pool management in your application there is the `sql.connect()` function that is used to connect to the global connection pool. You can make repeated calls to this function, and if the global pool is already connected, it will resolve to the connected pool. The following example obtains the global connection pool by running `sql.connect()`, and then runs the query against the pool.

NB: It's important to note that there can only be one global connection pool connected at a time. Providing a different connection config to the `connect()` function will not create a new connection if it is already connected.

```js
const sql = require('mssql')
const config = { ... }

// run a query against the global connection pool
function runQuery(query) {
  // sql.connect() will return the existing global pool if it exists or create a new one if it doesn't
  return sql.connect(config).then((pool) => {
    return pool.query(query)
  })
}
```

Awaiting or `.then`-ing the pool creation is a safe way to ensure that the pool is always ready, without knowing where it is needed first. In practice, once the pool is created then there will be no delay for the next `connect()` call.

Also notice that we do *not* close the global pool by calling `sql.close()` after the query is executed, because other queries may need to be run against this pool and closing it will add additional overhead to running subsequent queries. You should only ever close the global pool if you're certain the application is finished. Or for example, if you are running some kind of CLI tool or a CRON job you can close the pool at the end of the script.

### Global Pool Single Instance

The ability to call `connect()` and `close()` repeatedly on the global pool is intended to make pool management easier, however it is better to maintain your own reference to the pool, where `connect()` is called **once**, and the resulting global pool's connection promise is re-used throughout the entire application.

For example, in Express applications, the following approach uses a single global pool instance added to the `app.locals` so the application has access to it when needed. The server start is then chained inside the `connect()` promise.

```js
const express = require('express')
const sql = require('mssql')
const config  = {/*...*/}
//instantiate a connection pool
const appPool = new sql.ConnectionPool(config)
//require route handlers and use the same connection pool everywhere
const route1 = require('./routes/route1')
const app = express()
app.get('/path', route1)

//connect the pool and start the web server when done
appPool.connect().then(function(pool) {
  app.locals.db = pool;
  const server = app.listen(3000, function () {
    const host = server.address().address
    const port = server.address().port
    console.log('Example app listening at http://%s:%s', host, port)
  })
}).catch(function(err) {
  console.error('Error creating connection pool', err)
});
```

Then the route uses the connection pool in the `app.locals` object:

```js
// ./routes/route1.js
const sql = require('mssql');

module.exports = function(req, res) {
  req.app.locals.db.query('SELECT TOP 10 * FROM table_name', function(err, recordset) {
    if (err) {
      console.error(err)
      res.status(500).send('SERVER ERROR')
      return
    }
    res.status(200).json({ message: 'success' })
  })
}
```

### Advanced Pool Management

For some use-cases you may want to implement your own connection pool management, rather than using the global connection pool. Reasons for doing this include:

* Supporting connections to multiple databases
* Creation of separate pools for read vs read/write operations

The following code is an example of a custom connection pool implementation.

```js
// pool-manager.js
const mssql = require('mssql')
const pools = new Map();

module.exports = {
 /**
  * Get or create a pool. If a pool doesn't exist the config must be provided.
  * If the pool does exist the config is ignored (even if it was different to the one provided
  * when creating the pool)
  *
  * @param {string} name
  * @param {{}} [config]
  * @return {Promise.<mssql.ConnectionPool>}
  */
 get: (name, config) => {
  if (!pools.has(name)) {
   if (!config) {
    throw new Error('Pool does not exist');
   }
   const pool = new mssql.ConnectionPool(config);
   // automatically remove the pool from the cache if `pool.close()` is called
   const close = pool.close.bind(pool);
   pool.close = (...args) => {
    pools.delete(name);
    return close(...args);
   }
   pools.set(name, pool.connect());
  }
  return pools.get(name);
 },
 /**
  * Closes all the pools and removes them from the store
  *
  * @return {Promise<mssql.ConnectionPool[]>}
  */
 closeAll: () => Promise.all(Array.from(pools.values()).map((connect) => {
  return connect.then((pool) => pool.close());
 })),
};
```

This file can then be used in your application to create, fetch, and close pools.

```js
const { get } = require('./pool-manager')

async function example() {
  const pool = await get('default')
  return pool.request().query('SELECT 1')
}
```

Similar to the global connection pool, you should aim to only close a pool when you know it will never be needed by the application again. Typically this will only be when your application is shutting down.

### Result value manipulation

In some instances it is desirable to manipulate the record data as it is returned from the database, this may be to cast it as a particular object (eg: `moment` object instead of `Date`) or similar.

In v8.0.0+ it is possible to register per-datatype handlers:

```js
const sql = require('mssql')

// in this example all integer values will return 1 more than their actual value in the database
sql.valueHandler.set(sql.TYPES.Int, (value) => value + 1)

sql.query('SELECT * FROM [example]').then((result) => {
  // all `int` columns will return a manipulated value as per the callback above
})
```

## Configuration

The following is an example configuration object:

```javascript
const config = {
    user: '...',
    password: '...',
    server: 'localhost',
    database: '...',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
}
```

### General (same for all drivers)

- **user** - User name to use for authentication.
- **password** - Password to use for authentication.
- **server** - Server to connect to. You can use 'localhost\\instance' to connect to named instance.
- **port** - Port to connect to (default: `1433`). Don't set when connecting to named instance.
- **domain** - Once you set domain, driver will connect to SQL Server using domain login.
- **database** - Database to connect to (default: dependent on server configuration).
- **connectionTimeout** - Connection timeout in ms (default: `15000`).
- **requestTimeout** - Request timeout in ms (default: `15000`). NOTE: msnodesqlv8 driver doesn't support timeouts < 1 second. When passed via connection string, the key must be `request timeout`
- **stream** - Stream recordsets/rows instead of returning them all at once as an argument of callback (default: `false`). You can also enable streaming for each request independently (`request.stream = true`). Always set to `true` if you plan to work with large amount of rows.
- **parseJSON** - Parse JSON recordsets to JS objects (default: `false`). For more information please see section [JSON support](#json-support).
- **pool.max** - The maximum number of connections there can be in the pool (default: `10`).
- **pool.min** - The minimum of connections there can be in the pool (default: `0`).
- **pool.idleTimeoutMillis** - The Number of milliseconds before closing an unused connection (default: `30000`).
- **arrayRowMode** - Return row results as a an array instead of a keyed object. Also adds `columns` array. (default: `false`) See [Handling Duplicate Column Names](#handling-duplicate-column-names)

Complete list of pool options can be found [here](https://github.com/vincit/tarn.js/#usage).

### Formats

In addition to configuration object there is an option to pass config as a connection string. Connection strings are supported.

##### Classic Connection String

###### Standard configuration using tedious driver

```
Server=localhost,1433;Database=database;User Id=username;Password=password;Encrypt=true
```
###### Standard configuration using msnodesqlv8 driver
```
Driver=msnodesqlv8;Server=(local)\INSTANCE;Database=database;UID=DOMAIN\username;PWD=password;Encrypt=true
```

##### Azure Active Directory Authentication Connection String

Several types of Azure Authentication are supported:

###### Authentication using Active Directory Integrated
```
Server=*.database.windows.net;Database=database;Authentication=Active Directory Integrated;Client secret=clientsecret;Client Id=clientid;Tenant Id=tenantid;Encrypt=true
```
Note: Internally, the 'Active Directory Integrated' will change its type depending on the other parameters you add to it. On the example above, it will change to azure-active-directory-service-principal-secret because we supplied a Client Id, Client secret and Tenant Id.

If you want to utilize Authentication tokens (azure-active-directory-access-token) Just remove the unnecessary additional parameters and supply only a token parameter, such as in this example:

```
Server=*.database.windows.net;Database=database;Authentication=Active Directory Integrated;token=token;Encrypt=true
```

Finally if you want to utilize managed identity services such as managed identity service app service you can follow this example below:
```
Server=*.database.windows.net;Database=database;Authentication=Active Directory Integrated;msi endpoint=msiendpoint;Client Id=clientid;msi secret=msisecret;Encrypt=true
```
or if its managed identity service virtual machines, then follow this:
```
Server=*.database.windows.net;Database=database;Authentication=Active Directory Integrated;msi endpoint=msiendpoint;Client Id=clientid;Encrypt=true
```

We can also utilizes Active Directory Password but unlike the previous examples, it is not part of the Active Directory Integrated Authentication.

###### Authentication using Active Directory Password
```
Server=*.database.windows.net;Database=database;Authentication=Active Directory Password;User Id=username;Password=password;Client Id=clientid;Tenant Id=tenantid;Encrypt=true
```

For more reference, you can consult [here](https://tediousjs.github.io/tedious/api-connection.html#function_newConnection). Under the authentication.type parameter.

## Drivers

### Tedious

Default driver, actively maintained and production ready. Platform independent, runs everywhere Node.js runs. Officially supported by Microsoft.

**Extra options:**

- **beforeConnect(conn)** - Function, which is invoked before opening the connection. The parameter `conn` is the configured tedious `Connection`. It can be used for attaching event handlers like in this example:
```js
require('mssql').connect({...config, beforeConnect: conn => {
  conn.once('connect', err => { err ? console.error(err) : console.log('mssql connected')})
  conn.once('end', err => { err ? console.error(err) : console.log('mssql disconnected')})
}})
```
- **options.instanceName** - The instance name to connect to. The SQL Server Browser service must be running on the database server, and UDP port 1434 on the database server must be reachable.
- **options.useUTC** - A boolean determining whether or not use UTC time for values without time zone offset (default: `true`).
- **options.encrypt** - A boolean determining whether or not the connection will be encrypted (default: `true`).
- **options.tdsVersion** - The version of TDS to use (default: `7_4`, available: `7_1`, `7_2`, `7_3_A`, `7_3_B`, `7_4`).
- **options.appName** - Application name used for SQL server logging.
- **options.abortTransactionOnError** - A boolean determining whether to rollback a transaction automatically if any error is encountered during the given transaction's execution. This sets the value for `XACT_ABORT` during the initial SQL phase of a connection.

**Authentication:**

On top of the extra options, an `authentication` property can be added to the pool config option

- **authentication** - An object with authentication settings, according to the [Tedious Documentation](https://tediousjs.github.io/tedious/api-connection.html). Passing this object will override `user`, `password`, `domain` settings.
- **authentication.type** - Type of the authentication method, valid types are `default`, `ntlm`, `azure-active-directory-password`, `azure-active-directory-access-token`, `azure-active-directory-msi-vm`, or `azure-active-directory-msi-app-service`
- **authentication.options** - Options of the authentication required by the `tedious` driver, depends on `authentication.type`. For more details, check [Tedious Authentication Interfaces](https://github.com/tediousjs/tedious/blob/v11.1.1/src/connection.ts#L200-L318)

More information about Tedious specific options: http://tediousjs.github.io/tedious/api-connection.html

### Microsoft / Contributors Node V8 Driver for Node.js for SQL Server

**Requires Node.js v10+ or newer. Windows 32-64 bits or Linux/macOS 64 bits only.** This driver is not part of the default package and must be installed separately by `npm install msnodesqlv8@^2`. To use this driver, use this require syntax: `const sql = require('mssql/msnodesqlv8')`.

Note: If you use import into your lib to prepare your request (`const { VarChar } = require('mssql')`) you also need to upgrade all your types import into your code (`const { VarChar } = require('mssql/msnodesqlv8')`) or a `connection.on is not a function` error will be thrown.


**Extra options:**

- **beforeConnect(conn)** - Function, which is invoked before opening the connection. The parameter `conn` is the connection configuration, that can be modified to pass extra parameters to the driver's `open()` method.
- **connectionString** - Connection string (default: see below).
- **options.instanceName** - The instance name to connect to. The SQL Server Browser service must be running on the database server, and UDP port 1444 on the database server must be reachable.
- **options.trustedConnection** - Use Windows Authentication (default: `false`).
- **options.useUTC** - A boolean determining whether or not to use UTC time for values without time zone offset (default: `true`).

Default connection string when connecting to port:
```
Driver={SQL Server Native Client 11.0};Server={#{server},#{port}};Database={#{database}};Uid={#{user}};Pwd={#{password}};Trusted_Connection={#{trusted}};
```

Default connection string when connecting to named instance:
```
Driver={SQL Server Native Client 11.0};Server={#{server}\\#{instance}};Database={#{database}};Uid={#{user}};Pwd={#{password}};Trusted_Connection={#{trusted}};
```

Please note that the connection string with this driver is not the same than tedious and use yes/no instead of true/false. You can see more on the [ODBC](https://docs.microsoft.com/fr-fr/dotnet/api/system.data.odbc.odbcconnection.connectionstring?view=dotnet-plat-ext-5.0) documentation.

## Connections

Internally, each `ConnectionPool` instance is a separate pool of TDS connections. Once you create a new `Request`/`Transaction`/`Prepared Statement`, a new TDS connection is acquired from the pool and reserved for desired action. Once the action is complete, connection is released back to the pool. Connection health check is built-in so once the dead connection is discovered, it is immediately replaced with a new one.

**IMPORTANT**: Always attach an `error` listener to created connection. Whenever something goes wrong with the connection it will emit an error and if there is no listener it will crash your application with an uncaught error.

```javascript
const pool = new sql.ConnectionPool({ /* config */ })
```

### Events

- **error(err)** - Dispatched on connection error.

---------------------------------------

### connect ([callback])

Create a new connection pool. The initial probe connection is created to find out whether the configuration is valid.

__Arguments__

- **callback(err)** - A callback which is called after initial probe connection has established, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const pool = new sql.ConnectionPool({
    user: '...',
    password: '...',
    server: 'localhost',
    database: '...'
})

pool.connect(err => {
    // ...
})
```

__Errors__
- ELOGIN (`ConnectionError`) - Login failed.
- ETIMEOUT (`ConnectionError`) - Connection timeout.
- EALREADYCONNECTED (`ConnectionError`) - Database is already connected!
- EALREADYCONNECTING (`ConnectionError`) - Already connecting to database!
- EINSTLOOKUP (`ConnectionError`) - Instance lookup failed.
- ESOCKET (`ConnectionError`) - Socket error.

---------------------------------------

### close()

Close all active connections in the pool.

__Example__

```javascript
pool.close()
```

## Request

```javascript
const request = new sql.Request(/* [pool or transaction] */)
```

If you omit pool/transaction argument, global pool is used instead.

### Events

- **recordset(columns)** - Dispatched when metadata for new recordset are parsed.
- **row(row)** - Dispatched when new row is parsed.
- **done(returnValue)** - Dispatched when request is complete.
- **error(err)** - Dispatched on error.
- **info(message)** - Dispatched on informational message.

---------------------------------------

### execute (procedure, [callback])

Call a stored procedure.

__Arguments__

- **procedure** - Name of the stored procedure to be executed.
- **callback(err, recordsets, returnValue)** - A callback which is called after execution has completed, or an error has occurred. `returnValue` is also accessible as property of recordsets. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const request = new sql.Request()
request.input('input_parameter', sql.Int, value)
request.output('output_parameter', sql.Int)
request.execute('procedure_name', (err, result) => {
    // ... error checks

    console.log(result.recordsets.length) // count of recordsets returned by the procedure
    console.log(result.recordsets[0].length) // count of rows contained in first recordset
    console.log(result.recordset) // first recordset from result.recordsets
    console.log(result.returnValue) // procedure return value
    console.log(result.output) // key/value collection of output values
    console.log(result.rowsAffected) // array of numbers, each number represents the number of rows affected by executed statemens

    // ...
})
```

__Errors__
- EREQUEST (`RequestError`) - *Message from SQL Server*
- ECANCEL (`RequestError`) - Cancelled.
- ETIMEOUT (`RequestError`) - Request timeout.
- ENOCONN (`RequestError`) - No connection is specified for that request.
- ENOTOPEN (`ConnectionError`) - Connection not yet open.
- ECONNCLOSED (`ConnectionError`) - Connection is closed.
- ENOTBEGUN (`TransactionError`) - Transaction has not begun.
- EABORT (`TransactionError`) - Transaction was aborted (by user or because of an error).

---------------------------------------

### input (name, [type], value)

Add an input parameter to the request.

__Arguments__

- **name** - Name of the input parameter without @ char.
- **type** - SQL data type of input parameter. If you omit type, module automatically decide which SQL data type should be used based on JS data type.
- **value** - Input parameter value. `undefined` and `NaN` values are automatically converted to `null` values.

__Example__

```javascript
request.input('input_parameter', value)
request.input('input_parameter', sql.Int, value)
```

__JS Data Type To SQL Data Type Map__

- `String` -> `sql.NVarChar`
- `Number` -> `sql.Int`
- `Boolean` -> `sql.Bit`
- `Date` -> `sql.DateTime`
- `Buffer` -> `sql.VarBinary`
- `sql.Table` -> `sql.TVP`

Default data type for unknown object is `sql.NVarChar`.

You can define your own type map.

```javascript
sql.map.register(MyClass, sql.Text)
```

You can also overwrite the default type map.

```javascript
sql.map.register(Number, sql.BigInt)
```

__Errors__ (synchronous)
- EARGS (`RequestError`) - Invalid number of arguments.
- EINJECT (`RequestError`) - SQL injection warning.

---------------------------------------

NB: Do not use parameters `@p{n}` as these are used by the internal drivers and cause a conflict.

### output (name, type, [value])

Add an output parameter to the request.

__Arguments__

- **name** - Name of the output parameter without @ char.
- **type** - SQL data type of output parameter.
- **value** - Output parameter value initial value. `undefined` and `NaN` values are automatically converted to `null` values. Optional.

__Example__

```javascript
request.output('output_parameter', sql.Int)
request.output('output_parameter', sql.VarChar(50), 'abc')
```

__Errors__ (synchronous)
- EARGS (`RequestError`) - Invalid number of arguments.
- EINJECT (`RequestError`) - SQL injection warning.

---------------------------------------

### toReadableStream

Convert request to a Node.js ReadableStream

__Example__

```javascript
const { pipeline } = require('stream')
const request = new sql.Request()
const readableStream = request.toReadableStream()
pipeline(readableStream, transformStream, writableStream)
request.query('select * from mytable')
```

OR if you wanted to increase the highWaterMark of the read stream to buffer more rows in memory

```javascript
const { pipeline } = require('stream')
const request = new sql.Request()
const readableStream = request.toReadableStream({ highWaterMark: 100 })
pipeline(readableStream, transformStream, writableStream)
request.query('select * from mytable')
```


### pipe (stream)

Sets request to `stream` mode and pulls all rows from all recordsets to a given stream.

__Arguments__

- **stream** - Writable stream in object mode.

__Example__

```javascript
const request = new sql.Request()
request.pipe(stream)
request.query('select * from mytable')
stream.on('error', err => {
    // ...
})
stream.on('finish', () => {
    // ...
})
```

---------------------------------------

### query (command, [callback])

Execute the SQL command. To execute commands like `create procedure` or if you plan to work with local temporary tables, use [batch](#batch-batch-callback) instead.

__Arguments__

- **command** - T-SQL command to be executed.
- **callback(err, recordset)** - A callback which is called after execution has completed, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const request = new sql.Request()
request.query('select 1 as number', (err, result) => {
    // ... error checks

    console.log(result.recordset[0].number) // return 1

    // ...
})
```

__Errors__
- ETIMEOUT (`RequestError`) - Request timeout.
- EREQUEST (`RequestError`) - *Message from SQL Server*
- ECANCEL (`RequestError`) - Cancelled.
- ENOCONN (`RequestError`) - No connection is specified for that request.
- ENOTOPEN (`ConnectionError`) - Connection not yet open.
- ECONNCLOSED (`ConnectionError`) - Connection is closed.
- ENOTBEGUN (`TransactionError`) - Transaction has not begun.
- EABORT (`TransactionError`) - Transaction was aborted (by user or because of an error).

```javascript
const request = new sql.Request()
request.query('select 1 as number; select 2 as number', (err, result) => {
    // ... error checks

    console.log(result.recordset[0].number) // return 1
    console.log(result.recordsets[0][0].number) // return 1
    console.log(result.recordsets[1][0].number) // return 2
})
```

**NOTE**: To get number of rows affected by the statement(s), see section [Affected Rows](#affected-rows).

---------------------------------------

### batch (batch, [callback])

Execute the SQL command. Unlike [query](#query-command-callback), it doesn't use `sp_executesql`, so is not likely that SQL Server will reuse the execution plan it generates for the SQL. Use this only in special cases, for example when you need to execute commands like `create procedure` which can't be executed with [query](#query-command-callback) or if you're executing statements longer than 4000 chars on SQL Server 2000. Also you should use this if you're plan to work with local temporary tables ([more information here](http://weblogs.sqlteam.com/mladenp/archive/2006/11/03/17197.aspx)).

NOTE: Table-Valued Parameter (TVP) is not supported in batch.

__Arguments__

- **batch** - T-SQL command to be executed.
- **callback(err, recordset)** - A callback which is called after execution has completed, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const request = new sql.Request()
request.batch('create procedure #temporary as select * from table', (err, result) => {
    // ... error checks
})
```

__Errors__
- ETIMEOUT (`RequestError`) - Request timeout.
- EREQUEST (`RequestError`) - *Message from SQL Server*
- ECANCEL (`RequestError`) - Cancelled.
- ENOCONN (`RequestError`) - No connection is specified for that request.
- ENOTOPEN (`ConnectionError`) - Connection not yet open.
- ECONNCLOSED (`ConnectionError`) - Connection is closed.
- ENOTBEGUN (`TransactionError`) - Transaction has not begun.
- EABORT (`TransactionError`) - Transaction was aborted (by user or because of an error).

You can enable multiple recordsets in queries with the `request.multiple = true` command.

---------------------------------------

### bulk (table, [options,] [callback])

Perform a bulk insert.

__Arguments__

- **table** - `sql.Table` instance.
- **options** - Options object to be passed through to driver (currently tedious only). Optional. If argument is a function it will be treated as the callback.
- **callback(err, rowCount)** - A callback which is called after bulk insert has completed, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const table = new sql.Table('table_name') // or temporary table, e.g. #temptable
table.create = true
table.columns.add('a', sql.Int, {nullable: true, primary: true})
table.columns.add('b', sql.VarChar(50), {nullable: false})
table.rows.add(777, 'test')

const request = new sql.Request()
request.bulk(table, (err, result) => {
    // ... error checks
})
```

**IMPORTANT**: Always indicate whether the column is nullable or not!

**TIP**: If you set `table.create` to `true`, module will check if the table exists before it start sending data. If it doesn't, it will automatically create it. You can specify primary key columns by setting `primary: true` to column's options. Primary key constraint on multiple columns is supported.

**TIP**: You can also create Table variable from any recordset with `recordset.toTable()`. You can optionally specify table type name in the first argument.

__Errors__
- ENAME (`RequestError`) - Table name must be specified for bulk insert.
- ETIMEOUT (`RequestError`) - Request timeout.
- EREQUEST (`RequestError`) - *Message from SQL Server*
- ECANCEL (`RequestError`) - Cancelled.
- ENOCONN (`RequestError`) - No connection is specified for that request.
- ENOTOPEN (`ConnectionError`) - Connection not yet open.
- ECONNCLOSED (`ConnectionError`) - Connection is closed.
- ENOTBEGUN (`TransactionError`) - Transaction has not begun.
- EABORT (`TransactionError`) - Transaction was aborted (by user or because of an error).

---------------------------------------

### cancel()

Cancel currently executing request. Return `true` if cancellation packet was send successfully.

__Example__

```javascript
const request = new sql.Request()
request.query('waitfor delay \'00:00:05\'; select 1 as number', (err, result) => {
    console.log(err instanceof sql.RequestError)  // true
    console.log(err.message)                      // Cancelled.
    console.log(err.code)                         // ECANCEL

    // ...
})

request.cancel()
```

## Transaction

**IMPORTANT:** always use `Transaction` class to create transactions - it ensures that all your requests are executed on one connection. Once you call `begin`, a single connection is acquired from the connection pool and all subsequent requests (initialized with the `Transaction` object) are executed exclusively on this connection. After you call `commit` or `rollback`, connection is then released back to the connection pool.

```javascript
const transaction = new sql.Transaction(/* [pool] */)
```

If you omit connection argument, global connection is used instead.

__Example__

```javascript
const transaction = new sql.Transaction(/* [pool] */)
transaction.begin(err => {
    // ... error checks

    const request = new sql.Request(transaction)
    request.query('insert into mytable (mycolumn) values (12345)', (err, result) => {
        // ... error checks

        transaction.commit(err => {
            // ... error checks

            console.log("Transaction committed.")
        })
    })
})
```

Transaction can also be created by `const transaction = pool.transaction()`. Requests can also be created by `const request = transaction.request()`.

__Aborted transactions__

This example shows how you should correctly handle transaction errors when `abortTransactionOnError` (`XACT_ABORT`) is enabled. Added in 2.0.

```javascript
const transaction = new sql.Transaction(/* [pool] */)
transaction.begin(err => {
    // ... error checks

    let rolledBack = false

    transaction.on('rollback', aborted => {
        // emited with aborted === true

        rolledBack = true
    })

    new sql.Request(transaction)
    .query('insert into mytable (bitcolumn) values (2)', (err, result) => {
        // insert should fail because of invalid value

        if (err) {
            if (!rolledBack) {
                transaction.rollback(err => {
                    // ... error checks
                })
            }
        } else {
            transaction.commit(err => {
                // ... error checks
            })
        }
    })
})
```

### Events

- **begin** - Dispatched when transaction begin.
- **commit** - Dispatched on successful commit.
- **rollback(aborted)** - Dispatched on successful rollback with an argument determining if the transaction was aborted (by user or because of an error).

---------------------------------------

### begin ([isolationLevel], [callback])

Begin a transaction.

__Arguments__

- **isolationLevel** - Controls the locking and row versioning behavior of TSQL statements issued by a connection. Optional. `READ_COMMITTED` by default. For possible values see `sql.ISOLATION_LEVEL`.
- **callback(err)** - A callback which is called after transaction has began, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const transaction = new sql.Transaction()
transaction.begin(err => {
    // ... error checks
})
```

__Errors__
- ENOTOPEN (`ConnectionError`) - Connection not yet open.
- EALREADYBEGUN (`TransactionError`) - Transaction has already begun.

---------------------------------------

### commit ([callback])

Commit a transaction.

__Arguments__

- **callback(err)** - A callback which is called after transaction has committed, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const transaction = new sql.Transaction()
transaction.begin(err => {
    // ... error checks

    transaction.commit(err => {
        // ... error checks
    })
})
```

__Errors__
- ENOTBEGUN (`TransactionError`) - Transaction has not begun.
- EREQINPROG (`TransactionError`) - Can't commit transaction. There is a request in progress.

---------------------------------------

### rollback ([callback])

Rollback a transaction. If the queue isn't empty, all queued requests will be Cancelled and the transaction will be marked as aborted.

__Arguments__

- **callback(err)** - A callback which is called after transaction has rolled back, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const transaction = new sql.Transaction()
transaction.begin(err => {
    // ... error checks

    transaction.rollback(err => {
        // ... error checks
    })
})
```

__Errors__
- ENOTBEGUN (`TransactionError`) - Transaction has not begun.
- EREQINPROG (`TransactionError`) - Can't rollback transaction. There is a request in progress.

## Prepared Statement

**IMPORTANT:** always use `PreparedStatement` class to create prepared statements - it ensures that all your executions of prepared statement are executed on one connection. Once you call `prepare`, a single connection is acquired from the connection pool and all subsequent executions are executed exclusively on this connection. After you call `unprepare`, the connection is then released back to the connection pool.

```javascript
const ps = new sql.PreparedStatement(/* [pool] */)
```

If you omit the connection argument, the global connection is used instead.

__Example__

```javascript
const ps = new sql.PreparedStatement(/* [pool] */)
ps.input('param', sql.Int)
ps.prepare('select @param as value', err => {
    // ... error checks

    ps.execute({param: 12345}, (err, result) => {
        // ... error checks

        // release the connection after queries are executed
        ps.unprepare(err => {
            // ... error checks

        })
    })
})
```

**IMPORTANT**: Remember that each prepared statement means one reserved connection from the pool. Don't forget to unprepare a prepared statement when you've finished your queries!

You can execute multiple queries against the same prepared statement but you *must* unprepare the statement when you have finished using it otherwise you will cause the connection pool to run out of available connections.

**TIP**: You can also create prepared statements in transactions (`new sql.PreparedStatement(transaction)`), but keep in mind you can't execute other requests in the transaction until you call `unprepare`.

---------------------------------------

### input (name, type)

Add an input parameter to the prepared statement.

__Arguments__

- **name** - Name of the input parameter without @ char.
- **type** - SQL data type of input parameter.

__Example__

```javascript
ps.input('input_parameter', sql.Int)
ps.input('input_parameter', sql.VarChar(50))
```

__Errors__ (synchronous)
- EARGS (`PreparedStatementError`) - Invalid number of arguments.
- EINJECT (`PreparedStatementError`) - SQL injection warning.

---------------------------------------

### output (name, type)

Add an output parameter to the prepared statement.

__Arguments__

- **name** - Name of the output parameter without @ char.
- **type** - SQL data type of output parameter.

__Example__

```javascript
ps.output('output_parameter', sql.Int)
ps.output('output_parameter', sql.VarChar(50))
```

__Errors__ (synchronous)
- EARGS (`PreparedStatementError`) - Invalid number of arguments.
- EINJECT (`PreparedStatementError`) - SQL injection warning.

---------------------------------------

### prepare (statement, [callback])

Prepare a statement.

__Arguments__

- **statement** - T-SQL statement to prepare.
- **callback(err)** - A callback which is called after preparation has completed, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const ps = new sql.PreparedStatement()
ps.prepare('select @param as value', err => {
    // ... error checks
})
```

__Errors__
- ENOTOPEN (`ConnectionError`) - Connection not yet open.
- EALREADYPREPARED (`PreparedStatementError`) - Statement is already prepared.
- ENOTBEGUN (`TransactionError`) - Transaction has not begun.

---------------------------------------

### execute (values, [callback])

Execute a prepared statement.

__Arguments__

- **values** - An object whose names correspond to the names of parameters that were added to the prepared statement before it was prepared.
- **callback(err)** - A callback which is called after execution has completed, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const ps = new sql.PreparedStatement()
ps.input('param', sql.Int)
ps.prepare('select @param as value', err => {
    // ... error checks

    ps.execute({param: 12345}, (err, result) => {
        // ... error checks

        console.log(result.recordset[0].value) // return 12345
        console.log(result.rowsAffected) // Returns number of affected rows in case of INSERT, UPDATE or DELETE statement.
        
        ps.unprepare(err => {
            // ... error checks
        })
    })
})
```

You can also stream executed request.

```javascript
const ps = new sql.PreparedStatement()
ps.input('param', sql.Int)
ps.prepare('select @param as value', err => {
    // ... error checks

    ps.stream = true
    const request = ps.execute({param: 12345})

    request.on('recordset', columns => {
        // Emitted once for each recordset in a query
    })

    request.on('row', row => {
        // Emitted for each row in a recordset
    })

    request.on('error', err => {
        // May be emitted multiple times
    })

    request.on('done', result => {
        // Always emitted as the last one
        
        console.log(result.rowsAffected) // Returns number of affected rows in case of INSERT, UPDATE or DELETE statement.
        
        ps.unprepare(err => {
            // ... error checks
        })
    })
})
```

**TIP**: To learn more about how number of affected rows works, see section [Affected Rows](#affected-rows).

__Errors__
- ENOTPREPARED (`PreparedStatementError`) - Statement is not prepared.
- ETIMEOUT (`RequestError`) - Request timeout.
- EREQUEST (`RequestError`) - *Message from SQL Server*
- ECANCEL (`RequestError`) - Cancelled.

---------------------------------------

### unprepare ([callback])

Unprepare a prepared statement.

__Arguments__

- **callback(err)** - A callback which is called after unpreparation has completed, or an error has occurred. Optional. If omitted, returns [Promise](#promises).

__Example__

```javascript
const ps = new sql.PreparedStatement()
ps.input('param', sql.Int)
ps.prepare('select @param as value', err => {
    // ... error checks

    ps.unprepare(err => {
        // ... error checks

    })
})
```

__Errors__
- ENOTPREPARED (`PreparedStatementError`) - Statement is not prepared.

## CLI

If you want to add the MSSQL CLI tool to your path, you must install it globally with `npm install -g mssql`.

__Setup__

Create a `.mssql.json` configuration file (anywhere). Structure of the file is the same as the standard configuration object.

```json
{
    "user": "...",
    "password": "...",
    "server": "localhost",
    "database": "..."
}
```

__Example__

```shell
echo "select * from mytable" | mssql /path/to/config
```
Results in:
```json
[[{"username":"patriksimek","password":"tooeasy"}]]
```

You can also query for multiple recordsets.

```shell
echo "select * from mytable; select * from myothertable" | mssql
```
Results in:
```json
[[{"username":"patriksimek","password":"tooeasy"}],[{"id":15,"name":"Product name"}]]
```

If you omit config path argument, mssql will try to load it from current working directory.

__Overriding config settings__

You can override some config settings via CLI options (`--user`, `--password`, `--server`, `--database`, `--port`).

```shell
echo "select * from mytable" | mssql /path/to/config --database anotherdatabase
```
Results in:
```json
[[{"username":"onotheruser","password":"quiteeasy"}]]
```

## Geography and Geometry

node-mssql has built-in deserializer for Geography and Geometry CLR data types.

### Geography

Geography types can be constructed several different ways. Refer carefully to documentation to verify the coordinate ordering; the ST methods tend to order parameters as longitude (x) then latitude (y), while custom CLR methods tend to prefer to order them as latitude (y) then longitude (x).

The query:

```sql
select geography::STGeomFromText(N'POLYGON((1 1, 3 1, 3 1, 1 1))',4326)
```

results in:

```javascript
{
  srid: 4326,
  version: 2,
  points: [
    Point { lat: 1, lng: 1, z: null, m: null },
    Point { lat: 1, lng: 3, z: null, m: null },
    Point { lat: 1, lng: 3, z: null, m: null },
    Point { lat: 1, lng: 1, z: null, m: null }
  ],
  figures: [ { attribute: 1, pointOffset: 0 } ],
  shapes: [ { parentOffset: -1, figureOffset: 0, type: 3 } ],
  segments: []
}
```

**NOTE:** You will also see `x` and `y` coordinates in parsed Geography points,
they are not recommended for use. They have thus been omitted from this example.
For compatibility, they remain flipped (x, the horizontal offset, is instead used for latitude, the vertical), and thus risk misleading you.
Prefer instead to use the `lat` and `lng` properties.

### Geometry

Geometry types can also be constructed in several ways. Unlike Geographies, they are consistent in always placing x before y. node-mssql decodes the result of this query:

```sql
select geometry::STGeomFromText(N'POLYGON((1 1, 3 1, 3 7, 1 1))',4326)
```

into the JavaScript object:

```javascript
{
  srid: 4326,
  version: 1,
  points: [
    Point { x: 1, y: 1, z: null, m: null },
    Point { x: 1, y: 3, z: null, m: null },
    Point { x: 7, y: 3, z: null, m: null },
    Point { x: 1, y: 1, z: null, m: null }
  ],
  figures: [ { attribute: 2, pointOffset: 0 } ],
  shapes: [ { parentOffset: -1, figureOffset: 0, type: 3 } ],
  segments: []
}
```

## Table-Valued Parameter (TVP)

Supported on SQL Server 2008 and later. You can pass a data table as a parameter to stored procedure. First, we have to create custom type in our database.

```sql
CREATE TYPE TestType AS TABLE ( a VARCHAR(50), b INT );
```

Next we will need a stored procedure.

```sql
CREATE PROCEDURE MyCustomStoredProcedure (@tvp TestType readonly) AS SELECT * FROM @tvp
```

Now let's go back to our Node.js app.

```javascript
const tvp = new sql.Table() // You can optionally specify table type name in the first argument.

// Columns must correspond with type we have created in database.
tvp.columns.add('a', sql.VarChar(50))
tvp.columns.add('b', sql.Int)

// Add rows
tvp.rows.add('hello tvp', 777) // Values are in same order as columns.
```

You can send table as a parameter to stored procedure.

```javascript
const request = new sql.Request()
request.input('tvp', tvp)
request.execute('MyCustomStoredProcedure', (err, result) => {
    // ... error checks

    console.dir(result.recordsets[0][0]) // {a: 'hello tvp', b: 777}
})
```

**TIP**: You can also create Table variable from any recordset with `recordset.toTable()`. You can optionally specify table type name in the first argument.

You can clear the table rows for easier batching by using `table.rows.clear()`

```js
const tvp = new sql.Table() // You can optionally specify table type name in the first argument.

// Columns must correspond with type we have created in database.
tvp.columns.add('a', sql.VarChar(50))
tvp.columns.add('b', sql.Int)

// Add rows
tvp.rows.add('hello tvp', 777) // Values are in same order as columns.
tvp.rows.clear()
```

## Response Schema

An object returned from a `sucessful` basic query would look like the following.
```javascript
{
	recordsets: [
		[
			{
				COL1: "some content",
				COL2: "some more content"
			}
		]
	],
	recordset: [
		{
			COL1: "some content",
			COL2: "some more content"
		}
	],
	output: {},
	rowsAffected: [1]
}

```

## Affected Rows

If you're performing `INSERT`, `UPDATE` or `DELETE` in a query, you can read number of affected rows. The `rowsAffected` variable is an array of numbers. Each number represents number of affected rows by a single statement.

__Example using Promises__

```javascript
const request = new sql.Request()
request.query('update myAwesomeTable set awesomness = 100').then(result => {
    console.log(result.rowsAffected)
})
```

__Example using callbacks__

```javascript
const request = new sql.Request()
request.query('update myAwesomeTable set awesomness = 100', (err, result) => {
    console.log(result.rowsAffected)
})
```

__Example using streaming__

In addition to the rowsAffected attribute on the done event, each statement will emit the number of affected rows as it is completed.

```javascript
const request = new sql.Request()
request.stream = true
request.query('update myAwesomeTable set awesomness = 100')
request.on('rowsaffected', rowCount => {
    console.log(rowCount)
})
request.on('done', result => {
    console.log(result.rowsAffected)
})
```

## JSON support

SQL Server 2016 introduced built-in JSON serialization. By default, JSON is returned as a plain text in a special column named `JSON_F52E2B61-18A1-11d1-B105-00805F49916B`.

Example
```sql
SELECT
    1 AS 'a.b.c',
    2 AS 'a.b.d',
    3 AS 'a.x',
    4 AS 'a.y'
FOR JSON PATH
```

Results in:
```javascript
recordset = [ { 'JSON_F52E2B61-18A1-11d1-B105-00805F49916B': '{"a":{"b":{"c":1,"d":2},"x":3,"y":4}}' } ]
```

You can enable built-in JSON parser with `config.parseJSON = true`. Once you enable this, recordset will contain rows of parsed JS objects. Given the same example, result will look like this:
```javascript
recordset = [ { a: { b: { c: 1, d: 2 }, x: 3, y: 4 } } ]
```

**IMPORTANT**: In order for this to work, there must be exactly one column named `JSON_F52E2B61-18A1-11d1-B105-00805F49916B` in the recordset.

More information about JSON support can be found in [official documentation](https://msdn.microsoft.com/en-us/library/dn921882.aspx).

## Handling Duplicate Column Names

If your queries contain output columns with identical names, the default behaviour of `mssql` will only return column metadata for the last column with that name. You will also not always be able to re-assemble the order of output columns requested. 

Default behaviour:
```javascript
const request = new sql.Request()
request
    .query("select 'asdf' as name, 'qwerty' as other_name, 'jkl' as name")
    .then(result => {
        console.log(result)
    });
```
Results in:
```javascript
{
  recordsets: [
    [ { name: [ 'asdf', 'jkl' ], other_name: 'qwerty' } ]
  ],
  recordset: [ { name: [ 'asdf', 'jkl' ], other_name: 'qwerty' } ],
  output: {},
  rowsAffected: [ 1 ]
}
```

You can use the `arrayRowMode` configuration parameter to return the row values as arrays and add a separate array of column values. `arrayRowMode` can be set globally during the initial connection, or per-request.

```javascript
const request = new sql.Request()
request.arrayRowMode = true
request
    .query("select 'asdf' as name, 'qwerty' as other_name, 'jkl' as name")
    .then(result => {
        console.log(result)
    });
```

Results in:
```javascript
{
  recordsets: [ [ [ 'asdf', 'qwerty', 'jkl' ] ] ],
  recordset: [ [ 'asdf', 'qwerty', 'jkl' ] ],
  output: {},
  rowsAffected: [ 1 ],
  columns: [
    [
      {
        index: 0,
        name: 'name',
        length: 4,
        type: [sql.VarChar],
        scale: undefined,
        precision: undefined,
        nullable: false,
        caseSensitive: false,
        identity: false,
        readOnly: true
      },
      {
        index: 1,
        name: 'other_name',
        length: 6,
        type: [sql.VarChar],
        scale: undefined,
        precision: undefined,
        nullable: false,
        caseSensitive: false,
        identity: false,
        readOnly: true
      },
      {
        index: 2,
        name: 'name',
        length: 3,
        type: [sql.VarChar],
        scale: undefined,
        precision: undefined,
        nullable: false,
        caseSensitive: false,
        identity: false,
        readOnly: true
      }
    ]
  ]
}
```

__Streaming Duplicate Column Names__

When using `arrayRowMode` with `stream` enabled, the output from the `recordset` event (as described in [Streaming](#streaming)) is returned as an array of column metadata, instead of as a keyed object. The order of the column metadata provided by the `recordset` event will match the order of row values when `arrayRowMode` is enabled.

Default behaviour (without `arrayRowMode`):
```javascript
const request = new sql.Request()
request.stream = true
request.query("select 'asdf' as name, 'qwerty' as other_name, 'jkl' as name")
request.on('recordset', recordset => console.log(recordset))
```


Results in:

```javascript
{
  name: {
    index: 2,
    name: 'name',
    length: 3,
    type: [sql.VarChar],
    scale: undefined,
    precision: undefined,
    nullable: false,
    caseSensitive: false,
    identity: false,
    readOnly: true
  },
  other_name: {
    index: 1,
    name: 'other_name',
    length: 6,
    type: [sql.VarChar],
    scale: undefined,
    precision: undefined,
    nullable: false,
    caseSensitive: false,
    identity: false,
    readOnly: true
  }
}
```

With `arrayRowMode`:
```javascript
const request = new sql.Request()
request.stream = true
request.arrayRowMode = true
request.query("select 'asdf' as name, 'qwerty' as other_name, 'jkl' as name")

request.on('recordset', recordset => console.log(recordset))
```

Results in:
```javascript
[
  {
    index: 0,
    name: 'name',
    length: 4,
    type: [sql.VarChar],
    scale: undefined,
    precision: undefined,
    nullable: false,
    caseSensitive: false,
    identity: false,
    readOnly: true
  },
  {
    index: 1,
    name: 'other_name',
    length: 6,
    type: [sql.VarChar],
    scale: undefined,
    precision: undefined,
    nullable: false,
    caseSensitive: false,
    identity: false,
    readOnly: true
  },
  {
    index: 2,
    name: 'name',
    length: 3,
    type: [sql.VarChar],
    scale: undefined,
    precision: undefined,
    nullable: false,
    caseSensitive: false,
    identity: false,
    readOnly: true
  }
]
```

## Errors

There are 4 types of errors you can handle:

- **ConnectionError** - Errors related to connections and connection pool.
- **TransactionError** - Errors related to creating, committing and rolling back transactions.
- **RequestError** - Errors related to queries and stored procedures execution.
- **PreparedStatementError** - Errors related to prepared statements.

Those errors are initialized in node-mssql module and its original stack may be cropped. You can always access original error with `err.originalError`.

SQL Server may generate more than one error for one request so you can access preceding errors with `err.precedingErrors`.

### Error Codes

Each known error has `name`, `code` and `message` properties.

Name | Code | Message
:--- | :--- | :---
`ConnectionError` | ELOGIN | Login failed.
`ConnectionError` | ETIMEOUT | Connection timeout.
`ConnectionError` | EDRIVER | Unknown driver.
`ConnectionError` | EALREADYCONNECTED | Database is already connected!
`ConnectionError` | EALREADYCONNECTING | Already connecting to database!
`ConnectionError` | ENOTOPEN | Connection not yet open.
`ConnectionError` | EINSTLOOKUP | Instance lookup failed.
`ConnectionError` | ESOCKET | Socket error.
`ConnectionError` | ECONNCLOSED | Connection is closed.
`TransactionError` | ENOTBEGUN | Transaction has not begun.
`TransactionError` | EALREADYBEGUN | Transaction has already begun.
`TransactionError` | EREQINPROG | Can't commit/rollback transaction. There is a request in progress.
`TransactionError` | EABORT | Transaction has been aborted.
`RequestError` | EREQUEST | Message from SQL Server. Error object contains additional details.
`RequestError` | ECANCEL | Cancelled.
`RequestError` | ETIMEOUT | Request timeout.
`RequestError` | EARGS | Invalid number of arguments.
`RequestError` | EINJECT | SQL injection warning.
`RequestError` | ENOCONN | No connection is specified for that request.
`PreparedStatementError` | EARGS | Invalid number of arguments.
`PreparedStatementError` | EINJECT | SQL injection warning.
`PreparedStatementError` | EALREADYPREPARED | Statement is already prepared.
`PreparedStatementError` | ENOTPREPARED | Statement is not prepared.

### Detailed SQL Errors

SQL errors (`RequestError` with `err.code` equal to `EREQUEST`) contains additional details.

- **err.number** - The error number.
- **err.state** - The error state, used as a modifier to the number.
- **err.class** - The class (severity) of the error. A class of less than 10 indicates an informational message. Detailed explanation can be found [here](https://msdn.microsoft.com/en-us/library/dd304156.aspx).
- **err.lineNumber** - The line number in the SQL batch or stored procedure that caused the error. Line numbers begin at 1; therefore, if the line number is not applicable to the message, the value of LineNumber will be 0.
- **err.serverName** - The server name.
- **err.procName** - The stored procedure name.

## Informational messages

To receive informational messages generated by `PRINT` or `RAISERROR` commands use:

```javascript
const request = new sql.Request()
request.on('info', info => {
    console.dir(info)
})
request.query('print \'Hello world.\';', (err, result) => {
    // ...
})
```

Structure of informational message:

- **info.message** - Message.
- **info.number** - The message number.
- **info.state** - The message state, used as a modifier to the number.
- **info.class** - The class (severity) of the message. Equal or lower than 10. Detailed explanation can be found [here](https://msdn.microsoft.com/en-us/library/dd304156.aspx).
- **info.lineNumber** - The line number in the SQL batch or stored procedure that generated the message. Line numbers begin at 1; therefore, if the line number is not applicable to the message, the value of LineNumber will be 0.
- **info.serverName** - The server name.
- **info.procName** - The stored procedure name.

## Metadata

Recordset metadata are accessible through the `recordset.columns` property.

```javascript
const request = new sql.Request()
request.query('select convert(decimal(18, 4), 1) as first, \'asdf\' as second', (err, result) => {
    console.dir(result.recordset.columns)

    console.log(result.recordset.columns.first.type === sql.Decimal) // true
    console.log(result.recordset.columns.second.type === sql.VarChar) // true
})
```

Columns structure for example above:

```javascript
{
    first: {
        index: 0,
        name: 'first',
        length: 17,
        type: [sql.Decimal],
        scale: 4,
        precision: 18,
        nullable: true,
        caseSensitive: false
        identity: false
        readOnly: true
    },
    second: {
        index: 1,
        name: 'second',
        length: 4,
        type: [sql.VarChar],
        nullable: false,
        caseSensitive: false
        identity: false
        readOnly: true
    }
}
```

## Data Types

You can define data types with length/precision/scale:

```javascript
request.input("name", sql.VarChar, "abc")               // varchar(3)
request.input("name", sql.VarChar(50), "abc")           // varchar(50)
request.input("name", sql.VarChar(sql.MAX), "abc")      // varchar(MAX)
request.output("name", sql.VarChar)                     // varchar(8000)
request.output("name", sql.VarChar, "abc")              // varchar(3)

request.input("name", sql.Decimal, 155.33)              // decimal(18, 0)
request.input("name", sql.Decimal(10), 155.33)          // decimal(10, 0)
request.input("name", sql.Decimal(10, 2), 155.33)       // decimal(10, 2)

request.input("name", sql.DateTime2, new Date())        // datetime2(7)
request.input("name", sql.DateTime2(5), new Date())     // datetime2(5)
```

List of supported data types:

```
sql.Bit
sql.BigInt
sql.Decimal ([precision], [scale])
sql.Float
sql.Int
sql.Money
sql.Numeric ([precision], [scale])
sql.SmallInt
sql.SmallMoney
sql.Real
sql.TinyInt

sql.Char ([length])
sql.NChar ([length])
sql.Text
sql.NText
sql.VarChar ([length])
sql.NVarChar ([length])
sql.Xml

sql.Time ([scale])
sql.Date
sql.DateTime
sql.DateTime2 ([scale])
sql.DateTimeOffset ([scale])
sql.SmallDateTime

sql.UniqueIdentifier

sql.Variant

sql.Binary
sql.VarBinary ([length])
sql.Image

sql.UDT
sql.Geography
sql.Geometry
```

To setup MAX length for `VarChar`, `NVarChar` and `VarBinary` use `sql.MAX` length. Types `sql.XML` and `sql.Variant` are not supported as input parameters.

## SQL injection

This module has built-in SQL injection protection. Always use parameters or tagged template literals to pass sanitized values to your queries.

```javascript
const request = new sql.Request()
request.input('myval', sql.VarChar, '-- commented')
request.query('select @myval as myval', (err, result) => {
    console.dir(result)
})
```

## Known issues

### Tedious

- If you're facing problems with connecting SQL Server 2000, try setting the default TDS version to 7.1 with `config.options.tdsVersion = '7_1'` ([issue](https://github.com/tediousjs/node-mssql/issues/36))
- If you're executing a statement longer than 4000 chars on SQL Server 2000, always use [batch](#batch-batch-callback) instead of [query](#query-command-callback) ([issue](https://github.com/tediousjs/node-mssql/issues/68))

## 8.x to 9.x changes

- Upgraded to tedious version 15
- Dropped support for Node version <= 12

## 7.x to 8.x changes

- Upgraded to tedious version 14
- Removed internal library for connection string parsing. Connection strings can be resolved using the static method `parseConnectionString` on ConnectionPool

## 6.x to 7.x changes

- Upgraded tedious version to v11
- Upgraded msnodesqlv8 version support to v2
- Upgraded tarn.js version to v3
- Requests in stream mode that pipe into other streams no longer pass errors up the stream chain
- Request.pipe now pipes a true node stream for better support of backpressure
- tedious config option `trustServerCertificate` defaults to `false` if not supplied
- Dropped support for Node < 10

## 5.x to 6.x changes

- Upgraded `tarn.js` so `_poolDestroy` can take advantage of being a promise
- `ConnectionPool.close()` now returns a promise / callbacks will be executed once closing of the pool is complete; you must make
sure that connections are properly released back to the pool otherwise the pool may fail to close.
- It is safe to pass read-only config objects to the library; config objects are now cloned
- `options.encrypt` is now `true` by default
- `TYPES.Null` has now been removed
- Upgraded tedious driver to v6 and upgraded support for msnodesqlv8]
- You can now close the global connection by reference and this will clean up the global connection, eg: `const conn = sql.connect(); conn.close()` will be the same as `sql.close()`
- Bulk table inserts will attempt to coerce dates from non-Date objects if the column type is expecting a date
- Repeat calls to the global connect function (`sql.connect()`) will return the current global connection if it exists (rather than throwing an error)
- Attempting to add a parameter to queries / stored procedures will now throw an error; use `replaceInput` and `replaceOutput` instead
- Invalid isolation levels passed to `Transaction`s will now throw an error
- `ConnectionPool` now reports if it is healthy or not (`ConnectionPool.healthy`) which can be used to determine if the pool is able
to create new connections or not
- Pause/Resume support for streamed results has been added to the msnodesqlv8 driver

## 4.x to 5.x changes

- Moved pool library from `node-pool` to `tarn.js`
- `ConnectionPool.pool.size` deprecated, use `ConnectionPool.size` instead
- `ConnectionPool.pool.available` deprecated, use `ConnectionPool.available` instead
- `ConnectionPool.pool.pending` deprecated, use `ConnectionPool.pending` instead
- `ConnectionPool.pool.borrowed` deprecated, use `ConnectionPool.borrowed` instead

## 3.x to 4.x changes

- Library & tests are rewritten to ES6.
- `Connection` was renamed to `ConnectionPool`.
- Drivers are no longer loaded dynamically so the library is now compatible with Webpack. To use `msnodesqlv8` driver, use `const sql = require('mssql/msnodesqlv8')` syntax.
- Every callback/resolve now returns `result` object only. This object contains `recordsets` (array of recordsets), `recordset` (first recordset from array of recordsets), `rowsAffected` (array of numbers representig number of affected rows by each insert/update/delete statement) and `output` (key/value collection of output parameters' values).
- Affected rows are now returned as an array. A separate number for each SQL statement.
- Directive `multiple: true` was removed.
- `Transaction` and `PreparedStatement` internal queues was removed.
- ConnectionPool no longer emits `connect` and `close` events.
- Removed verbose and debug mode.
- Removed support for `tds` and `msnodesql` drivers.
- Removed support for Node versions lower than 4.

[npm-image]: https://img.shields.io/npm/v/mssql.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/mssql
[downloads-image]: https://img.shields.io/npm/dm/mssql.svg?style=flat-square
[downloads-url]: https://www.npmjs.com/package/mssql
[david-image]: https://img.shields.io/david/tediousjs/node-mssql.svg?style=flat-square
[david-url]: https://david-dm.org/tediousjs/node-mssql
[appveyor-image]: https://ci.appveyor.com/api/projects/status/e5gq1a0ujwams9t7/branch/master?svg=true
[appveyor-url]: https://ci.appveyor.com/project/tediousjs/node-mssql

[tedious-url]: https://www.npmjs.com/package/tedious
[msnodesqlv8-url]: https://www.npmjs.com/package/msnodesqlv8
