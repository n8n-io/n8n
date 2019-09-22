# Database

By default, n8n uses SQLite to save credentials, past executions, and workflows.
n8n however also supports MongoDB and PostgresDB.


## MongoDB

!> **WARNING**: Use Postgres if possible! Mongo has problems with saving large
   amounts of data in a document and causes also other problems. So support will
   may be dropped in the future.

To use MongoDB as database you can provide the following environment variables like
in the example bellow:
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

To use PostgresDB as database you can provide the following environment variables
 - `DB_TYPE=postgresdb`
 - `DB_POSTGRESDB_DATABASE` (default: 'n8n')
 - `DB_POSTGRESDB_HOST` (default: 'localhost')
 - `DB_POSTGRESDB_PORT` (default: 5432)
 - `DB_POSTGRESDB_USER` (default: 'root')
 - `DB_POSTGRESDB_PASSWORD` (default: empty)


```bash
export DB_TYPE=postgresdb
export DB_POSTGRESDB_DATABASE=n8n
export DB_POSTGRESDB_HOST=postgresdb
export DB_POSTGRESDB_PORT=5432
export DB_POSTGRESDB_USER=n8n
export DB_POSTGRESDB_PASSWORD=n8n

n8n start
```

## SQLite

The default database which gets used if no other one is defined.

The database file is located at:
`~/.n8n/database.sqlite`


## Other Databases

Currently, only the above databases are supported. n8n uses internally
[TypeORM](https://typeorm.io) so adding support for the following databases
should not be too much work:

 - CockroachDB
 - MariaDB
 - Microsoft SQL
 - MySQL
 - Oracle

If you can not use any of the currently supported databases for some reason and
you can program, you can simply add support by yourself. If not you can request
that support should be added here:

[https://community.n8n.io/c/feature-requests/cli](https://community.n8n.io/c/feature-requests/cli)
