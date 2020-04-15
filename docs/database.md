# Database

By default, n8n uses SQLite to save credentials, past executions, and workflows. However,
n8n also supports MongoDB and PostgresDB.


## Shared Settings

The following environment variables get used by all databases:

 - `DB_TABLE_PREFIX` (default: '') - Prefix for table names


## MongoDB

!> **WARNING**: Use PostgresDB, if possible! MongoDB has problems saving large
   amounts of data in a document, among other issues. So, support
   may be dropped in the future.

To use MongoDB as the database, you can provide the following environment variables like
in the example below:
 - `DB_TYPE=mongodb`
 - `DB_MONGODB_CONNECTION_URL=<CONNECTION_URL>`

Replace the following placeholders with the actual data:
 - MONGO_DATABASE
 - MONGO_HOST
 - MONGO_PORT
 - MONGO_USER
 - MONGO_PASSWORD

```bash
export DB_TYPE=mongodb
export DB_MONGODB_CONNECTION_URL=mongodb://MONGO_USER:MONGO_PASSWORD@MONGO_HOST:MONGO_PORT/MONGO_DATABASE
n8n start
```


## PostgresDB

To use PostgresDB as the database, you can provide the following environment variables
 - `DB_TYPE=postgresdb`
 - `DB_POSTGRESDB_DATABASE` (default: 'n8n')
 - `DB_POSTGRESDB_HOST` (default: 'localhost')
 - `DB_POSTGRESDB_PORT` (default: 5432)
 - `DB_POSTGRESDB_USER` (default: 'root')
 - `DB_POSTGRESDB_PASSWORD` (default: empty)
 - `DB_POSTGRESDB_SCHEMA` (default: 'public')


```bash
export DB_TYPE=postgresdb
export DB_POSTGRESDB_DATABASE=n8n
export DB_POSTGRESDB_HOST=postgresdb
export DB_POSTGRESDB_PORT=5432
export DB_POSTGRESDB_USER=n8n
export DB_POSTGRESDB_PASSWORD=n8n
export DB_POSTGRESDB_SCHEMA=n8n

n8n start
```

## MySQL / MariaDB

The compatibility with MySQL/MariaDB has been tested. Even then, it is advisable to observe the operation of the application with this database as this option has been recently added. If you spot any problems, feel free to submit a burg report or a pull request.

To use MySQL as database you can provide the following environment variables:
 - `DB_TYPE=mysqldb` or `DB_TYPE=mariadb`
 - `DB_MYSQLDB_DATABASE` (default: 'n8n')
 - `DB_MYSQLDB_HOST` (default: 'localhost')
 - `DB_MYSQLDB_PORT` (default: 3306)
 - `DB_MYSQLDB_USER` (default: 'root')
 - `DB_MYSQLDB_PASSWORD` (default: empty)


```bash
export DB_TYPE=mysqldb
export DB_MYSQLDB_DATABASE=n8n
export DB_MYSQLDB_HOST=mysqldb
export DB_MYSQLDB_PORT=3306
export DB_MYSQLDB_USER=n8n
export DB_MYSQLDB_PASSWORD=n8n

n8n start
```

## SQLite

This is the default database that gets used if nothing is defined.

The database file is located at:
`~/.n8n/database.sqlite`


## Other Databases

Currently, only the databases mentioned above are supported. n8n internally uses
[TypeORM](https://typeorm.io), so adding support for the following databases
should not be too much work:

 - CockroachDB
 - Microsoft SQL
 - Oracle

If you cannot use any of the currently supported databases for some reason and
you can code, we'd appreciate your support in the form of a pull request. If not, you can request
for support here:

[https://community.n8n.io/c/feature-requests/cli](https://community.n8n.io/c/feature-requests/cli)
