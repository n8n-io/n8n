import { GlobalConfig } from '@n8n/config';
import type { entities } from '@n8n/db';
import { AuthRolesService, DbConnection, DbConnectionOptions } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataSourceOptions } from '@n8n/typeorm';
import { DataSource as Connection } from '@n8n/typeorm';
import { randomString } from 'n8n-workflow';

export const testDbPrefix = 'n8n_test_';
let isInitialized = false;

/**
 * Generate options for a bootstrap DB connection, to create and drop test databases.
 */
export const getBootstrapDBOptions = (dbType: 'postgresdb' | 'mysqldb'): DataSourceOptions => {
	const globalConfig = Container.get(GlobalConfig);
	const type = dbType === 'postgresdb' ? 'postgres' : 'mysql';
	return {
		type,
		...Container.get(DbConnectionOptions).getOverrides(dbType),
		database: type,
		entityPrefix: globalConfig.database.tablePrefix,
		schema: dbType === 'postgresdb' ? globalConfig.database.postgresdb.schema : undefined,
	};
};

/**
 * Initialize one test DB per suite run, with bootstrap connection if needed.
 */
export async function init() {
	if (isInitialized) return;

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

	const dbConnection = Container.get(DbConnection);
	await dbConnection.init();
	await dbConnection.migrate();

	await Container.get(AuthRolesService).init();

	isInitialized = true;
}

export function isReady() {
	const { connectionState } = Container.get(DbConnection);
	return connectionState.connected && connectionState.migrated;
}

/**
 * Drop test DB, closing bootstrap connection if existing.
 */
export async function terminate() {
	const dbConnection = Container.get(DbConnection);
	await dbConnection.close();
	dbConnection.connectionState.connected = false;
	isInitialized = false;
}

type EntityName =
	| keyof typeof entities
	| 'InsightsRaw'
	| 'InsightsByPeriod'
	| 'InsightsMetadata'
	| 'DataTable'
	| 'DataTableColumn';

/**
 * Truncate specific DB tables in a test DB.
 */
export async function truncate(entities: EntityName[]) {
	const connection = Container.get(Connection);

	for (const name of entities) {
		await connection.getRepository(name).delete({});
	}
}
