import { GlobalConfig } from '@n8n/config';
import type { entities } from '@n8n/db';
import { AuthRolesService, DbConnection, DbConnectionOptions } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataSourceOptions } from '@n8n/typeorm';
import { DataSource as Connection } from '@n8n/typeorm';
import assert from 'assert';
import { randomString } from 'n8n-workflow';

export const testDbPrefix = 'n8n_test_';
let isInitialized = false;

/**
 * Generate options for a bootstrap DB connection, to create and drop test databases.
 */
export const getBootstrapDBOptions = (): DataSourceOptions => {
	const globalConfig = Container.get(GlobalConfig);
	assert(globalConfig.database.type === 'postgresdb', 'Database type must be postgresdb');

	return {
		type: 'postgres',
		...Container.get(DbConnectionOptions).getPostgresOverrides(),
		database: globalConfig.database.postgresdb.database,
		entityPrefix: globalConfig.database.tablePrefix,
		schema: globalConfig.database.postgresdb.schema,
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
		const bootstrapPostgres = await new Connection(getBootstrapDBOptions()).initialize();
		await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
		await bootstrapPostgres.destroy();

		globalConfig.database.postgresdb.database = testDbName;
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
	| 'DataTableColumn'
	| 'ChatHubSession'
	| 'ChatHubMessage'
	| 'ChatHubAgent'
	| 'OAuthClient'
	| 'AuthorizationCode'
	| 'AccessToken'
	| 'RefreshToken'
	| 'UserConsent'
	| 'DynamicCredentialEntry'
	| 'DynamicCredentialResolver'
	| 'DynamicCredentialUserEntry';

/**
 * Truncate specific DB tables in a test DB.
 */
export async function truncate(entities: EntityName[]) {
	const connection = Container.get(Connection);

	// Collect junction tables to clean
	const junctionTablesToClean = new Set<string>();

	// Find all junction tables associated with the entities being truncated
	for (const name of entities) {
		try {
			const metadata = connection.getMetadata(name);
			for (const relation of metadata.manyToManyRelations) {
				if (relation.junctionEntityMetadata) {
					const junctionTableName = relation.junctionEntityMetadata.tablePath;
					junctionTablesToClean.add(junctionTableName);
				}
			}
		} catch (error) {
			// Skip
		}
	}

	// Clean junction tables first (since they reference the entities)
	for (const tableName of junctionTablesToClean) {
		await connection.query(`DELETE FROM ${tableName}`);
	}

	for (const name of entities) {
		await connection.getRepository(name).delete({});
	}
}
