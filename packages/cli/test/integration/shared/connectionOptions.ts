import { ConnectionOptions } from 'typeorm';
import config = require('../../../config');

import { entities } from '../../../src/databases/entities';
import { mysqlMigrations } from '../../../src/databases/mysqldb/migrations';
import { postgresMigrations } from '../../../src/databases/postgresdb/migrations';
import { sqliteMigrations } from '../../../src/databases/sqlite/migrations';

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
		name: 'n8n_bs_postgres',
		type: 'postgres',
		database: 'postgres', // pre-existing
		host,
		port,
		username, // change via env to 'postgres'
		password, // change via env to 'password'
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
		username, // change via env to 'postgres'
		password, // change via env to 'password'

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
	const password = config.get('database.mysqldb.password'); // change via env to 'password'
	const host = config.get('database.mysqldb.host');
	const port = config.get('database.mysqldb.port');

	return {
		name: 'n8n_bs_mysql',
		database: 'n8n_bs_mysql',
		type: 'mysql',
		host,
		port,
		username,
		password,
	};
};

export const getMySqlOptions = ({ name }: { name: string }): ConnectionOptions => {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password'); // change via env to 'password'
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
