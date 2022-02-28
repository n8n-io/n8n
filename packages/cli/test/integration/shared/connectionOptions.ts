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

export function getOptions({ name }: { name: string }) {
	return name.startsWith('n8n_bs_')
		? getPostgresBootstrapConnectionOptions({ name })
		: getPostgresConnectionOptions({ name });
}

const getPostgresBootstrapConnectionOptions = ({ name }: { name: string }): ConnectionOptions => {
	return {
		name,
		type: 'postgres',
		database: 'postgres',
		host: 'localhost',
		port: 5432, // TODO: Make configurable?
		username: 'postgres', // TODO: Make configurable?
		password: 'password', // TODO: Make configurable?
		schema: 'public', // TODO: Make configurable?
	};
};

const getPostgresConnectionOptions = ({ name }: { name: string }): ConnectionOptions => {
	return {
		name,
		type: 'postgres',
		database: name,
		host: 'localhost',
		port: 5432, // TODO: Make configurable?
		password: 'password', // TODO: Make configurable?
		username: 'postgres', // TODO: Make configurable?

		entityPrefix: '',
		schema: 'public', // TODO: Make configurable?
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

// TODO: Pending mysql connection options

export const MYSQL_TEST_CONNECTION_OPTIONS: ConnectionOptions = {
	type: 'mysql',
	database: 'n8n',
	username: 'root',
	password: 'password',
	host: 'localhost',
	port: 3306,
};

export const getBootstrapMySqlConnectionOptions = (): ConnectionOptions => {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	// const password = 'password';
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

export const getMySqlConnectionOptions = ({ name }: { name: string }): ConnectionOptions => {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	// const password = 'password';
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
