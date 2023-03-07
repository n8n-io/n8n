import path from 'path';
import type { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { UserSettings } from 'n8n-core';

import { entities } from './entities';
import { mysqlMigrations } from './migrations/mysqldb';
import { postgresMigrations } from './migrations/postgresdb';
import { sqliteMigrations } from './migrations/sqlite';
import type { DatabaseType } from '@/Interfaces';
import config from '@/config';

const entitiesDir = path.resolve(__dirname, 'entities');

const getDBConnectionOptions = (dbType: DatabaseType) => {
	const entityPrefix = config.getEnv('database.tablePrefix');
	const migrationsDir = path.resolve(__dirname, 'migrations', dbType);
	const configDBType = dbType === 'mariadb' ? 'mysqldb' : dbType;
	const connectionDetails =
		configDBType === 'sqlite'
			? {
					database: path.resolve(
						UserSettings.getUserN8nFolderPath(),
						config.getEnv('database.sqlite.database'),
					),
			  }
			: {
					database: config.getEnv(`database.${configDBType}.database`),
					username: config.getEnv(`database.${configDBType}.user`),
					password: config.getEnv(`database.${configDBType}.password`),
					host: config.getEnv(`database.${configDBType}.host`),
					port: config.getEnv(`database.${configDBType}.port`),
			  };
	return {
		entityPrefix,
		entities: Object.values(entities),
		migrationsRun: false,
		migrationsTableName: `${entityPrefix}migrations`,
		cli: { entitiesDir, migrationsDir },
		...connectionDetails,
	};
};

export const getOptionOverrides = (dbType: 'postgresdb' | 'mysqldb') => ({
	database: config.getEnv(`database.${dbType}.database`),
	host: config.getEnv(`database.${dbType}.host`),
	port: config.getEnv(`database.${dbType}.port`),
	username: config.getEnv(`database.${dbType}.user`),
	password: config.getEnv(`database.${dbType}.password`),
});

export const getSqliteConnectionOptions = (): SqliteConnectionOptions => ({
	type: 'sqlite',
	...getDBConnectionOptions('sqlite'),
	migrations: sqliteMigrations,
});

export const getPostgresConnectionOptions = (): PostgresConnectionOptions => ({
	type: 'postgres',
	...getDBConnectionOptions('postgresdb'),
	schema: config.getEnv('database.postgresdb.schema'),
	migrations: postgresMigrations,
});

export const getMysqlConnectionOptions = (): MysqlConnectionOptions => ({
	type: 'mysql',
	...getDBConnectionOptions('mysqldb'),
	migrations: mysqlMigrations,
});

export const getMariaDBConnectionOptions = (): MysqlConnectionOptions => ({
	type: 'mariadb',
	...getDBConnectionOptions('mysqldb'),
	migrations: mysqlMigrations,
});
