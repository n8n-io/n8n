import { ConnectionOptions } from 'typeorm';
import config = require('../../../config');

import { entities } from '../../../src/databases/entities';
import { mysqlMigrations } from '../../../src/databases/mysqldb/migrations';
import { postgresMigrations } from '../../../src/databases/postgresdb/migrations';
import { sqliteMigrations } from '../../../src/databases/sqlite/migrations';
import { BOOTSTRAP_MYSQL_CONNECTION_NAME, BOOTSTRAP_POSTGRES_CONNECTION_NAME } from './constants';

// ----------------------------------
//             sqlite
// ----------------------------------

export const SQLITE_TEST_CONNECTION_OPTIONS: Readonly<ConnectionOptions> = {
	type: 'sqlite',
	database: ':memory:',

	entityPrefix: '',
	dropSchema: true,

	migrations: sqliteMigrations,
	migrationsTableName: 'migrations',
	migrationsRun: false,

	logging: false,
};

// ----------------------------------
//            postgres
// ----------------------------------

export const getBootstrapPostgresOptions = (): ConnectionOptions => {
	const username = config.get('database.postgresdb.user');
	const password = config.get('database.postgresdb.password');
	const host = config.get('database.postgresdb.host');
	const port = config.get('database.postgresdb.port');
	const schema = config.get('database.postgresdb.schema');

	return {
		name: BOOTSTRAP_POSTGRES_CONNECTION_NAME,
		type: 'postgres',
		database: 'postgres', // pre-existing default database
		host,
		port,
		username,
		password,
		schema,
	};
};

export const getPostgresOptions = ({ name }: { name: string }): ConnectionOptions => {
	const username = config.get('database.postgresdb.user');
	const password = config.get('database.postgresdb.password');
	const host = config.get('database.postgresdb.host');
	const port = config.get('database.postgresdb.port');
	const schema = config.get('database.postgresdb.schema');

	return {
		name,
		type: 'postgres',
		database: name,
		host,
		port,
		username,
		password,

		entityPrefix: '',
		schema,
		dropSchema: true,

		migrations: postgresMigrations,
		migrationsRun: true,
		migrationsTableName: 'migrations',

		entities: Object.values(entities),
		synchronize: false,
		logging: false,
	};
};

// ----------------------------------
//             mysql
// ----------------------------------


export const getBootstrapMySqlOptions = (): ConnectionOptions => {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	const host = config.get('database.mysqldb.host');
	const port = config.get('database.mysqldb.port');

	return {
		name: BOOTSTRAP_MYSQL_CONNECTION_NAME,
		database: BOOTSTRAP_MYSQL_CONNECTION_NAME,
		type: 'mysql',
		host,
		port,
		username,
		password,
	};
};

export const getMySqlOptions = ({ name }: { name: string }): ConnectionOptions => {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	const host = config.get('database.mysqldb.host');
	const port = config.get('database.mysqldb.port');

	return {
		name,
		database: name,
		type: 'mysql',
		host,
		port,
		username,
		password,
		migrations: mysqlMigrations,
		migrationsTableName: 'migrations',
		migrationsRun: true,
	};
};
