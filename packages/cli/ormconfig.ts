import {MongoDb, SQLite, MySQLDb, PostgresDb} from './src/databases/index';

module.exports = [
    {
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
        "type": "postgres",
        "logging": false,
        "entities": Object.values(PostgresDb),
        "migrations": [
           "./src/databases/postgresdb/Migrations/**/*.ts"
        ],
        "subscribers": [
           "src/subscriber/**/*.ts"
        ],
        "cli": {
           "entitiesDir": "./src/databases/postgresdb",
           "migrationsDir": "./src/databases/postgresdb/Migrations",
           "subscribersDir": "./src/databases/postgresdb/Subscribers"
        }
    },
    {
        "type": "sqlite",
        "logging": false,
        "entities": Object.values(SQLite),
        "migrations": [
           "./src/databases/sqlite/Migrations/**/*.ts"
        ],
        "subscribers": [
           "src/subscriber/**/*.ts"
        ],
        "cli": {
           "entitiesDir": "./src/databases/sqlite",
           "migrationsDir": "./src/databases/sqlite/Migrations",
           "subscribersDir": "./src/databases/sqlite/Subscribers"
        }
    },
    {
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