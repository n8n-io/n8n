import {MongoDb, SQLite, MySQLDb, PostgresDb} from '../src/databases/index';

module.exports = [
    {
        "name": "sqlite",
        "type": "sqlite",
        "logging": true,
        "entities": Object.values(SQLite),
        "database": "./packages/cli/database.sqlite",
        "migrations": [
           "./src/databases/sqlite/migrations/*.ts"
        ],
        "subscribers": [
            "./src/databases/sqlite/subscribers/*.ts"
        ],
        "cli": {
           "entitiesDir": "./src/databases/sqlite",
           "migrationsDir": "./src/databases/sqlite/migrations",
           "subscribersDir": "./src/databases/sqlite/subscribers"
        }
    },
    {
        "name": "mongodb",
        "type": "mongodb",
        "logging": false,
        "entities": Object.values(MongoDb),
        "url": "mongodb://root:example@localhost:27017/n8n",
        "authSource": 'admin',
        "migrations": [
           "./src/databases/mongodb/migrations/*.ts"
        ],
        "subscribers": [
           "src/subscriber/**/*.ts"
        ],
        "cli": {
           "entitiesDir": "./src/databases/mongodb",
           "migrationsDir": "./src/databases/mongodb/Migrations",
           "subscribersDir": "./src/databases/mongodb/Subscribers"
        }
    },
    {
        "name": "postgres",
        "type": "postgres",
        "logging": false,
        "host": "localhost",
        "username": "postgres",
        "password": "",
        "port": 5432,
        "database": "n8n",
        "schema": "public",
        "entities": Object.values(PostgresDb),
        "migrations": [
           "./src/databases/postgresdb/migrations/*.ts"
        ],
        "subscribers": [
           "src/subscriber/**/*.ts"
        ],
        "cli": {
           "entitiesDir": "./src/databases/postgresdb",
           "migrationsDir": "./src/databases/postgresdb/migrations",
           "subscribersDir": "./src/databases/postgresdb/subscribers"
        }
    },
    {
        "name": "mysql",
        "type": "mysql",
        "database": "n8n",
        "username": "root",
        "password": "password",
        "host": "localhost",
        "port": "3306",
        "logging": false,
        "entities": Object.values(MySQLDb),
        "migrations": [
           "./src/databases/mysqldb/migrations/*.ts"
        ],
        "subscribers": [
           "src/subscriber/**/*.ts"
        ],
        "cli": {
           "entitiesDir": "./src/databases/mysqldb",
           "migrationsDir": "./src/databases/mysqldb/migrations",
           "subscribersDir": "./src/databases/mysqldb/Subscribers"
        }
    },
        {
        "name": "mariadb",
        "type": "mariadb",
        "database": "n8n",
        "username": "root",
        "password": "password",
        "host": "localhost",
        "port": "3306",
        "logging": false,
        "entities": Object.values(MySQLDb),
        "migrations": [
           "./src/databases/mysqldb/migrations/*.ts"
        ],
        "subscribers": [
           "src/subscriber/**/*.ts"
        ],
        "cli": {
           "entitiesDir": "./src/databases/mysqldb",
           "migrationsDir": "./src/databases/mysqldb/migrations",
           "subscribersDir": "./src/databases/mysqldb/Subscribers"
        }
    },
];
