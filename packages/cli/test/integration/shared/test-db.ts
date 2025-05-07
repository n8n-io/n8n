import { GlobalConfig } from '@n8n/config';
import type { entities } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataSourceOptions } from '@n8n/typeorm';
import { DataSource as Connection } from '@n8n/typeorm';
import { randomString } from 'n8n-workflow';

import { getOptionOverrides } from '@/databases/config';
import * as Db from '@/db';

export const testDbPrefix = 'n8n_test_';

/**
 * Initialize one test DB per suite run, with bootstrap connection if needed.
 */
export async function init() {
	const globalConfig = Container.get(GlobalConfig);
	const dbType = globalConfig.database.type;
	const testDbName = `${testDbPrefix}${randomString(6, 10).toLowerCase()}_${Date.now()}`;

	if (dbType === 'postgresdb') {
		const bootstrapPostgres = await new Connection(
			getBootstrapDBOptions('postgresdb'),
		).initialize();
		await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
		await bootstrapPostgres.destroy();

		globalConfig.database.postgresdb.database = testDbName;
	} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
		const bootstrapMysql = await new Connection(getBootstrapDBOptions('mysqldb')).initialize();
		await bootstrapMysql.query(`CREATE DATABASE ${testDbName} DEFAULT CHARACTER SET utf8mb4`);
		await bootstrapMysql.destroy();

		globalConfig.database.mysqldb.database = testDbName;
	}

	await Db.init();
	await Db.migrate();
}

export function isReady() {
	return Db.connectionState.connected && Db.connectionState.migrated;
}

/**
 * Drop test DB, closing bootstrap connection if existing.
 */
export async function terminate() {
	await Db.close();
	Db.connectionState.connected = false;
}

type EntityName = keyof typeof entities | 'InsightsRaw' | 'InsightsByPeriod' | 'InsightsMetadata';

/**
 * Truncate specific DB tables in a test DB.
 */
export async function truncate(entities: EntityName[]) {
	const connection = Container.get(Connection);

	for (const name of entities) {
		await connection.getRepository(name).delete({});
	}
}

/**
 * Generate options for a bootstrap DB connection, to create and drop test databases.
 */
export const getBootstrapDBOptions = (dbType: 'postgresdb' | 'mysqldb'): DataSourceOptions => {
	const globalConfig = Container.get(GlobalConfig);
	const type = dbType === 'postgresdb' ? 'postgres' : 'mysql';
	return {
		type,
		...getOptionOverrides(dbType),
		database: type,
		entityPrefix: globalConfig.database.tablePrefix,
		schema: dbType === 'postgresdb' ? globalConfig.database.postgresdb.schema : undefined,
	};
};
