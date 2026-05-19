# Data Source Options

-   [What is `DataSourceOptions`](#what-is-datasourceoptions)
-   [Common data source options](#common-data-source-options)
-   [`mysql` / `mariadb` data source options](#mysql--mariadb-data-source-options)
-   [`postgres` data source options](#postgres--cockroachdb-data-source-options)
-   [`sqlite` data source options](#sqlite-data-source-options)
-   [DataSource options example](#data-source-options-example)

## What is `DataSourceOptions`

`DataSourceOptions` is a data source configuration you pass when you create a new `DataSource` instance.
Different RDBMS-es have their own specific options.

## Common data source options

-   `type` - RDBMS type. You must specify what database engine you use.
    Possible values are:
    "mysql", "postgres", "cockroachdb", "sap", "spanner", "mariadb", "sqlite", "cordova", "react-native", "nativescript", "sqljs", "oracle", "mssql", "mongodb", "aurora-mysql", "aurora-postgres", "expo", "better-sqlite3", "capacitor", "libsql".
    This option is **required**.

-   `extra` - Extra options to be passed to the underlying driver.
    Use it if you want to pass extra settings to underlying database driver.

-   `entities` - Entities, or Entity Schemas, to be loaded and used for this data source.
    Accepts both entity classes, entity schema classes, and directories paths to load from.
    Directories support glob patterns.
    Example: `entities: [Post, Category, "entity/*.js", "modules/**/entity/*.js"]`.
    Learn more about [Entities](entities.md).
    Learn more about [Entity Schemas](separating-entity-definition.md).

-   `subscribers` - Subscribers to be loaded and used for this data source.
    Accepts both entity classes and directories to load from.
    Directories support glob patterns.
    Example: `subscribers: [PostSubscriber, AppSubscriber, "subscriber/*.js", "modules/**/subscriber/*.js"]`.
    Learn more about [Subscribers](listeners-and-subscribers.md).

-   `migrations` - Migrations to be loaded and used for this data source.
    Accepts both migration classes and directories to load from.
    Directories support glob patterns.
    Example: `migrations: [FirstMigration, SecondMigration, "migration/*.js", "modules/**/migration/*.js"]`.
    Learn more about [Migrations](migrations.md).

-   `logging` - Indicates if logging is enabled or not.
    If set to `true` then query and error logging will be enabled.
    You can also specify different types of logging to be enabled, for example `["query", "error", "schema"]`.
    Learn more about [Logging](logging.md).

-   `logger` - Logger to be used for logging purposes. Possible values are "advanced-console", "simple-console" and "file".
    Default is "advanced-console". You can also specify a logger class that implements `Logger` interface.
    Learn more about [Logging](logging.md).

-   `maxQueryExecutionTime` - If query execution time exceed this given max execution time (in milliseconds)
    then logger will log this query.

-   `poolSize` - Configure maximum number of active connections is the pool.

-   `namingStrategy` - Naming strategy to be used to name tables and columns in the database.

-   `entityPrefix` - Prefixes with the given string all tables (or collections) on this data source.

-   `entitySkipConstructor` - Indicates if TypeORM should skip constructors when deserializing entities
    from the database. Note that when you do not call the constructor both private properties and default
    properties will not operate as expected.

-   `dropSchema` - Drops the schema each time data source is being initialized.
    Be careful with this option and don't use this in production - otherwise you'll lose all production data.
    This option is useful during debug and development.

-   `synchronize` - Indicates if database schema should be auto created on every application launch.
    Be careful with this option and don't use this in production - otherwise you can lose production data.
    This option is useful during debug and development.
    As an alternative to it, you can use CLI and run schema:sync command.
    Note that for MongoDB database it does not create schema, because MongoDB is schemaless.
    Instead, it syncs just by creating indices.

-   `migrationsRun` - Indicates if migrations should be auto run on every application launch.
    As an alternative, you can use CLI and run migration:run command.

-   `migrationsTableName` - Name of the table in the database which is going to contain information about executed migrations.
    By default, this table is called "migrations".

-   `migrationsTransactionMode` - Control transactions for migrations (default: `all`), can be one of `all` | `none` | `each`

-   `metadataTableName` - Name of the table in the database which is going to contain information about table metadata.
    By default, this table is called "typeorm_metadata".

-   `cache` - Enables entity result caching. You can also configure cache type and other cache options here.
    Read more about caching [here](caching.md).

-   `isolateWhereStatements` - Enables where statement isolation, wrapping each where clause in brackets automatically.
    eg. `.where("user.firstName = :search OR user.lastName = :search")` becomes `WHERE (user.firstName = ? OR user.lastName = ?)` instead of `WHERE user.firstName = ? OR user.lastName = ?`

## `mysql` / `mariadb` data source options

-   `url` - Connection url where perform connection to. Please note that other data source options will override parameters set from url.

-   `host` - Database host.

-   `port` - Database host port. Default mysql port is `3306`.

-   `username` - Database username.

-   `password` - Database password.

-   `database` - Database name.

-   `charset` - The charset for the connection. This is called "collation" in the SQL-level of MySQL
    (like utf8_general_ci). If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used. (Default: `UTF8_GENERAL_CI`).

-   `timezone` - the timezone configured on the MySQL server. This is used to typecast server date/time
    values to JavaScript Date object and vice versa. This can be `local`, `Z`, or an offset in the form
    `+HH:MM` or `-HH:MM`. (Default: `local`)

-   `connectTimeout` - The milliseconds before a timeout occurs during the initial connection to the MySQL server.
    (Default: `10000`)

-   `acquireTimeout` - The milliseconds before a timeout occurs during the initial connection to the MySql server. It differs from `connectTimeout` as it governs the TCP connection timeout where as connectTimeout does not. (default: `10000`)

-   `insecureAuth` - Allow connecting to MySQL instances that ask for the old (insecure) authentication method.
    (Default: `false`)

-   `supportBigNumbers` - When dealing with big numbers (`BIGINT` and `DECIMAL` columns) in the database,
    you should enable this option (Default: `true`)

-   `bigNumberStrings` - Enabling both `supportBigNumbers` and `bigNumberStrings` forces big numbers
    (`BIGINT` and `DECIMAL` columns) to be always returned as JavaScript String objects (Default: `true`).
    Enabling `supportBigNumbers` but leaving `bigNumberStrings` disabled will return big numbers as String
    objects only when they cannot be accurately represented with
    [JavaScript Number objects](http://ecma262-5.com/ELS5_HTML.htm#Section_8.5)
    (which happens when they exceed the `[-2^53, +2^53]` range), otherwise they will be returned as
    Number objects. This option is ignored if `supportBigNumbers` is disabled.

-   `dateStrings` - Force date types (`TIMESTAMP`, `DATETIME`, `DATE`) to be returned as strings rather than
    inflated into JavaScript Date objects. Can be true/false or an array of type names to keep as strings.
    (Default: `false`)

-   `debug` - Prints protocol details to stdout. Can be true/false or an array of packet type names that
    should be printed. (Default: `false`)

-   `trace` - Generates stack traces on Error to include call site of library entrance ("long stack traces").
    Slight performance penalty for most calls. (Default: `true`)

-   `multipleStatements` - Allow multiple mysql statements per query. Be careful with this, it could increase the scope
    of SQL injection attacks. (Default: `false`)

-   `legacySpatialSupport` - Use spatial functions like GeomFromText and AsText which are removed in MySQL 8. (Default: true)

-   `flags` - List of connection flags to use other than the default ones. It is also possible to blacklist default ones.
    For more information, check [Connection Flags](https://github.com/mysqljs/mysql#connection-flags).

-   `ssl` - object with ssl parameters or a string containing the name of ssl profile.
    See [SSL options](https://github.com/mysqljs/mysql#ssl-options).

## `postgres` data source options

-   `url` - Connection url where perform connection to. Please note that other data source options will override parameters set from url.

-   `host` - Database host.

-   `port` - Database host port. Default postgres port is `5432`.

-   `username` - Database username.

-   `password` - Database password.

-   `database` - Database name.

-   `schema` - Schema name. Default is "public".

-   `connectTimeoutMS` - The milliseconds before a timeout occurs during the initial connection to the postgres server. If `undefined`, or set to `0`, there is no timeout. Defaults to `undefined`.

-   `ssl` - Object with ssl parameters. See [TLS/SSL](https://node-postgres.com/features/ssl).

-   `uuidExtension` - The Postgres extension to use when generating UUIDs. Defaults to `uuid-ossp`. Can be changed to `pgcrypto` if the `uuid-ossp` extension is unavailable.

-   `poolErrorHandler` - A function that get's called when underlying pool emits `'error'` event. Takes single parameter (error instance) and defaults to logging with `warn` level.

-   `maxTransactionRetries` - A maximum number of transaction retries in case of 40001 error. Defaults to 5.

-   `logNotifications` - A boolean to determine whether postgres server [notice messages](https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html) and [notification events](https://www.postgresql.org/docs/current/sql-notify.html) should be included in client's logs with `info` level (default: `false`).

-   `installExtensions` - A boolean to control whether to install necessary postgres extensions automatically or not (default: `true`)

-   `applicationName` - A string visible in statistics and logs to help referencing an application to a connection (default: `undefined`)

-   `parseInt8` - A boolean to enable parsing 64-bit integers (int8) as JavaScript integers.
    By default int8 (bigint) values are returned as strings to avoid overflows.
    JavaScript doesn't have support for 64-bit integers, the maximum safe integer in js is: Number.MAX_SAFE_INTEGER (`+2^53`). Be careful when enabling `parseInt8`.
    Note: This option is ignored if the undelying driver does not support it.

## `sqlite` data source options

-   `database` - Database path. For example "mydb.sql"

## Data Source Options example

Here is a small example of data source options for mysql:

```typescript
{
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    logging: true,
    synchronize: true,
    entities: [
        "entity/*.js"
    ],
    subscribers: [
        "subscriber/*.js"
    ],
    entitySchemas: [
        "schema/*.json"
    ],
    migrations: [
        "migration/*.js"
    ]
}
```
