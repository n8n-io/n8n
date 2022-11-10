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
import { getConfigValue } from '@/GenericHelpers';

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
		migrationsRun: true,
		migrationsTableName: `${entityPrefix}migrations`,
		cli: { entitiesDir, migrationsDir },
		...connectionDetails,
	};
};

export const getOptionOverrides = async (dbType: 'postgresdb' | 'mysqldb') => ({
	database: (await getConfigValue(`database.${dbType}.database`)) as string,
	host: (await getConfigValue(`database.${dbType}.host`)) as string,
	port: (await getConfigValue(`database.${dbType}.port`)) as number,
	username: (await getConfigValue(`database.${dbType}.user`)) as string,
	password: (await getConfigValue(`database.${dbType}.password`)) as string,
});

export const getSqliteConnectionOptions = (): SqliteConnectionOptions => ({
	type: 'sqlite',
	...getDBConnectionOptions('sqlite'),
	migrationsRun: false, // sqlite migrations are manually run in `Db.ts`
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
