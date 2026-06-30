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
let testDbName: string | undefined;
let originalDatabase: string | undefined;

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
 *
 * When `N8N_TEST_TEMPLATE_DB` is set (Postgres only), the new test DB is created
 * via `CREATE DATABASE ... TEMPLATE <name>`, which clones the schema as a file
 * copy and skips the multi-second migration replay per file.
 */
export async function init() {
	if (isInitialized) return;

	const globalConfig = Container.get(GlobalConfig);
	const dbType = globalConfig.database.type;
	testDbName = `${testDbPrefix}${randomString(6, 10).toLowerCase()}_${Date.now()}`;

	const templateDb = dbType === 'postgresdb' ? process.env.N8N_TEST_TEMPLATE_DB : undefined;

	if (dbType === 'postgresdb') {
		originalDatabase = globalConfig.database.postgresdb.database;
		const bootstrapPostgres = await new Connection(getBootstrapDBOptions()).initialize();
		if (templateDb) {
			await bootstrapPostgres.query(`CREATE DATABASE ${testDbName} TEMPLATE ${templateDb}`);
		} else {
			await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
		}
		await bootstrapPostgres.destroy();

		globalConfig.database.postgresdb.database = testDbName;
	}

	const dbConnection = Container.get(DbConnection);
	await dbConnection.init();

	if (templateDb) {
		// Template already carries migrations + seeded roles — just mark state.
		dbConnection.connectionState.migrated = true;
	} else {
		await dbConnection.migrate();
		await Container.get(AuthRolesService).init();
	}

	isInitialized = true;
}

/**
 * Build a Postgres template DB with all migrations + auth roles seeded.
 * Idempotent: drops any existing DB with the same name first.
 * Called from Vitest globalSetup (orchestrator process) before workers fork —
 * each worker's `init()` then clones from the template instead of replaying
 * the full migration history.
 */
export async function initTemplateDb(templateName: string): Promise<void> {
	const globalConfig = Container.get(GlobalConfig);
	if (globalConfig.database.type !== 'postgresdb') {
		throw new Error('initTemplateDb only supports postgresdb');
	}

	const originalDb = globalConfig.database.postgresdb.database;

	const bootstrap = await new Connection(getBootstrapDBOptions()).initialize();
	await bootstrap.query(
		`UPDATE pg_database SET datistemplate = false WHERE datname = '${templateName}'`,
	);
	await bootstrap.query(`DROP DATABASE IF EXISTS ${templateName}`);
	await bootstrap.query(`CREATE DATABASE ${templateName}`);
	await bootstrap.destroy();

	globalConfig.database.postgresdb.database = templateName;
	const dbConnection = Container.get(DbConnection);
	await dbConnection.init();
	await dbConnection.migrate();
	await Container.get(AuthRolesService).init();
	await dbConnection.close();
	globalConfig.database.postgresdb.database = originalDb;

	// Mark as template so CREATE DATABASE ... TEMPLATE will accept it.
	const finalizer = await new Connection(getBootstrapDBOptions()).initialize();
	await finalizer.query(
		`UPDATE pg_database SET datistemplate = true WHERE datname = '${templateName}'`,
	);
	await finalizer.destroy();
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

	if (testDbName && originalDatabase) {
		const globalConfig = Container.get(GlobalConfig);
		if (globalConfig.database.type === 'postgresdb') {
			try {
				globalConfig.database.postgresdb.database = originalDatabase;
				const bootstrap = await new Connection(getBootstrapDBOptions()).initialize();
				await bootstrap.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
				await bootstrap.destroy();
			} catch (error) {
				// Best effort - don't fail tests over cleanup
				console.warn(`Failed to drop test database "${testDbName}":`, error);
			}
		}
		testDbName = undefined;
	}

	// Clear all cached DI singletons (DbConnection, DataSource, GlobalConfig,
	// AuthRolesService, …). With persistent Jest workers (no per-file process
	// recycling), the next test file's testDb.init() would otherwise reuse the
	// DbConnection instance whose DataSource we just destroyed — and try to
	// .initialize() it again, which hangs. Resetting forces the next get() to
	// rebuild the whole chain from the freshly-set env vars (e.g. the new
	// per-file Postgres database name we just switched to).
	Container.reset();

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
	| 'ChatHubTool'
	| 'OAuthClient'
	| 'AuthorizationCode'
	| 'AccessToken'
	| 'RefreshToken'
	| 'UserConsent'
	| 'DynamicCredentialEntry'
	| 'DynamicCredentialResolver'
	| 'DynamicCredentialUserEntry'
	| 'TokenExchangeJti'
	| 'TrustedKeySourceEntity'
	| 'TrustedKeyEntity';

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
