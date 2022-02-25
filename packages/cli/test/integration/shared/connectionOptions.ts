import { ConnectionOptions } from 'typeorm';

import { entities } from '../../../src/databases/entities';
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

export const getPostgresBootstrapConnectionOptions = ({ name }: { name: string }): ConnectionOptions => {
	return {
		name,
		type: 'postgres',
		database: 'postgres',
		host: 'localhost',
		port: 5432,
		username: 'postgres', // TODO: Make configurable
		password: 'password', // TODO: Make configurable
		schema: 'public',
	};
}

export const getPostgresConnectionOptions = ({
	name,
}: {
	name: string;
}): ConnectionOptions => {
	return {
		name,
		type: 'postgres',
		database: name,
		host: 'localhost',
		port: 5432,
		password: 'password', // TODO: Make configurable
		username: 'postgres', // TODO: Make configurable

		entityPrefix: '',
		schema: 'public',
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
