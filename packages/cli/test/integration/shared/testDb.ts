import type { DataSourceOptions as ConnectionOptions, Repository } from 'typeorm';
import { DataSource as Connection } from 'typeorm';
import { Container } from 'typedi';
import type { Class } from 'n8n-core';

import config from '@/config';
import * as Db from '@/Db';
import { entities } from '@db/entities';
import { mysqlMigrations } from '@db/migrations/mysqldb';
import { postgresMigrations } from '@db/migrations/postgresdb';
import { sqliteMigrations } from '@db/migrations/sqlite';

import { DB_INITIALIZATION_TIMEOUT } from './constants';
import { randomString } from './random';
import type { PostgresSchemaSection } from './types';

export type TestDBType = 'postgres' | 'mysql';

export const testDbPrefix = 'n8n_test_';

export function getPostgresSchemaSection(
	schema = config.getSchema(),
): PostgresSchemaSection | null {
	for (const [key, value] of Object.entries(schema)) {
		if (key === 'postgresdb') {
			return value._cvtProperties;
		}
	}
	return null;
}

/**
 * Initialize one test DB per suite run, with bootstrap connection if needed.
 */
export async function init() {
	jest.setTimeout(DB_INITIALIZATION_TIMEOUT);
	const dbType = config.getEnv('database.type');
	const testDbName = `${testDbPrefix}${randomString(6, 10)}_${Date.now()}`;

	if (dbType === 'sqlite') {
		// no bootstrap connection required
		await Db.init(getSqliteOptions({ name: testDbName }));
	} else if (dbType === 'postgresdb') {
		let bootstrapPostgres;
		const pgOptions = getBootstrapDBOptions('postgres');

		try {
			bootstrapPostgres = await new Connection(pgOptions).initialize();
		} catch (error) {
			const pgConfig = getPostgresSchemaSection();

			if (!pgConfig) throw new Error("Failed to find config schema section for 'postgresdb'");

			const message = [
				"ERROR: Failed to connect to Postgres default DB 'postgres'",
				'Please review your Postgres connection options:',
				`host: ${pgOptions.host} | port: ${pgOptions.port} | schema: ${pgOptions.schema} | username: ${pgOptions.username} | password: ${pgOptions.password}`,
				'Fix by setting correct values via environment variables:',
				`${pgConfig.host.env} | ${pgConfig.port.env} | ${pgConfig.schema.env} | ${pgConfig.user.env} | ${pgConfig.password.env}`,
				'Otherwise, make sure your Postgres server is running.',
			].join('\n');

			console.error(message);

			process.exit(1);
		}

		await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
		await bootstrapPostgres.destroy();

		await Db.init(getDBOptions('postgres', testDbName));
	} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
		const bootstrapMysql = await new Connection(getBootstrapDBOptions('mysql')).initialize();
		await bootstrapMysql.query(`CREATE DATABASE ${testDbName} DEFAULT CHARACTER SET utf8mb4`);
		await bootstrapMysql.destroy();

		await Db.init(getDBOptions('mysql', testDbName));
	}

	await Db.migrate();
}

/**
 * Drop test DB, closing bootstrap connection if existing.
 */
export async function terminate() {
	await Db.close();
}

// Can't use `Object.keys(entities)` here because some entities have a `Entity` suffix, while the repositories don't
const repositories = [
	'AuthIdentity',
	'AuthProviderSyncHistory',
	'Credentials',
	'EventDestinations',
	'ExecutionData',
	'ExecutionMetadata',
	'Execution',
	'InstalledNodes',
	'InstalledPackages',
	'Role',
	'Settings',
	'SharedCredentials',
	'SharedWorkflow',
	'Tag',
	'User',
	'Variables',
	'Webhook',
	'Workflow',
	'WorkflowHistory',
	'WorkflowStatistics',
	'WorkflowTagMapping',
] as const;

/**
 * Truncate specific DB tables in a test DB.
 */
export async function truncate(names: Array<(typeof repositories)[number]>) {
	for (const name of names) {
		const RepositoryClass: Class<Repository<object>> = (
			await import(`@db/repositories/${name.charAt(0).toLowerCase() + name.slice(1)}.repository`)
		)[`${name}Repository`];
		await Container.get(RepositoryClass).delete({});
	}
}

// ----------------------------------
//        connection options
// ----------------------------------

/**
 * Generate options for an in-memory sqlite database connection,
 * one per test suite run.
 */
const getSqliteOptions = ({ name }: { name: string }): ConnectionOptions => {
	return {
		name,
		type: 'sqlite',
		database: ':memory:',
		entityPrefix: config.getEnv('database.tablePrefix'),
		dropSchema: true,
		migrations: sqliteMigrations,
		migrationsTableName: 'migrations',
		migrationsRun: false,
		enableWAL: config.getEnv('database.sqlite.enableWAL'),
	};
};

const baseOptions = (type: TestDBType) => ({
	host: config.getEnv(`database.${type}db.host`),
	port: config.getEnv(`database.${type}db.port`),
	username: config.getEnv(`database.${type}db.user`),
	password: config.getEnv(`database.${type}db.password`),
	entityPrefix: config.getEnv('database.tablePrefix'),
	schema: type === 'postgres' ? config.getEnv('database.postgresdb.schema') : undefined,
});

/**
 * Generate options for a bootstrap DB connection, to create and drop test databases.
 */
export const getBootstrapDBOptions = (type: TestDBType) => ({
	type,
	name: type,
	database: type,
	...baseOptions(type),
});

const getDBOptions = (type: TestDBType, name: string) => ({
	type,
	name,
	database: name,
	...baseOptions(type),
	dropSchema: true,
	migrations: type === 'postgres' ? postgresMigrations : mysqlMigrations,
	migrationsRun: false,
	migrationsTableName: 'migrations',
	entities: Object.values(entities),
	synchronize: false,
	logging: false,
});
