import {MongoDb, SQLite, MySQLDb, PostgresDb} from './src/databases/index';

module.exports = [
    {
        "name": "sqlite",
        "type": "sqlite",
        "logging": true,
        "entities": Object.values(SQLite),
        "database": "C:\Users\Ronald\.n8n\database.sqlite",
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
        "migrations": [
           "./src/databases/mongodb/Migrations/**/*.ts"
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
        "password": "docker",
        "port": 5432,
        "database": "postgres",
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
        "logging": false,
        "entities": Object.values(MySQLDb),
        "migrations": [
           "./src/databases/mysqldb/Migrations/**/*.ts"
        ],
        "subscribers": [
           "src/subscriber/**/*.ts"
        ],
        "cli": {
           "entitiesDir": "./src/databases/mysqldb",
           "migrationsDir": "./src/databases/mysqldb/Migrations",
           "subscribersDir": "./src/databases/mysqldb/Subscribers"
        }
    },
];