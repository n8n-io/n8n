import type { DataSourceOptions, Repository } from '@n8n/typeorm';
import { DataSource as Connection } from '@n8n/typeorm';
import { Container } from 'typedi';
import type { Class } from 'n8n-core';

import config from '@/config';
import * as Db from '@/Db';
import { getOptionOverrides } from '@db/config';

import { randomString } from './random';

export const testDbPrefix = 'n8n_test_';

/**
 * Initialize one test DB per suite run, with bootstrap connection if needed.
 */
export async function init() {
	const dbType = config.getEnv('database.type');
	const testDbName = `${testDbPrefix}${randomString(6, 10)}_${Date.now()}`;

	if (dbType === 'postgresdb') {
		const bootstrapPostgres = await new Connection(
			getBootstrapDBOptions('postgresdb'),
		).initialize();
		await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
		await bootstrapPostgres.destroy();

		config.set('database.postgresdb.database', testDbName);
	} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
		const bootstrapMysql = await new Connection(getBootstrapDBOptions('mysqldb')).initialize();
		await bootstrapMysql.query(`CREATE DATABASE ${testDbName} DEFAULT CHARACTER SET utf8mb4`);
		await bootstrapMysql.destroy();

		config.set('database.mysqldb.database', testDbName);
	}

	await Db.init();
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
	'Execution',
	'ExecutionData',
	'ExecutionMetadata',
	'InstalledNodes',
	'InstalledPackages',
	'Project',
	'ProjectRelation',
	'Role',
	'Project',
	'ProjectRelation',
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

/**
 * Generate options for a bootstrap DB connection, to create and drop test databases.
 */
export const getBootstrapDBOptions = (dbType: 'postgresdb' | 'mysqldb'): DataSourceOptions => {
	const type = dbType === 'postgresdb' ? 'postgres' : 'mysql';
	return {
		type,
		...getOptionOverrides(dbType),
		database: type,
		entityPrefix: config.getEnv('database.tablePrefix'),
		schema: dbType === 'postgresdb' ? config.getEnv('database.postgresdb.schema') : undefined,
	};
};
