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
 * Per-attempt deadline for the Postgres init steps (create the test DB and
 * connect to it). Comfortably below the 30s testcontainers hook timeout so a
 * stalled connection or a blocked `CREATE DATABASE` fails fast with an
 * actionable error and gets retried, instead of silently eating the whole
 * hook budget and surfacing as an opaque "Exceeded timeout of a hook".
 */
const PG_INIT_STEP_TIMEOUT_MS = 20_000;
const PG_INIT_MAX_ATTEMPTS = 3;

/** Reject if `operation` doesn't settle within `ms`, with a labelled error. */
async function withTimeout<T>(operation: Promise<T>, ms: number, label: string): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${label} did not complete within ${ms}ms`)), ms);
	});
	try {
		return await Promise.race([operation, timeout]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

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

	const templateDb = dbType === 'postgresdb' ? process.env.N8N_TEST_TEMPLATE_DB : undefined;

	if (dbType === 'postgresdb') {
		originalDatabase = globalConfig.database.postgresdb.database;
		// Creating the per-file test DB and opening its connection are the steps
		// that can stall under parallel workers (a blocked `CREATE DATABASE ...
		// TEMPLATE` contending for the template, or a DataSource that never
		// connects). Bound each attempt and retry with a fresh DB name so a
		// transient stall recovers instead of timing out the whole hook.
		await initPostgresWithRetry(templateDb);
	} else {
		testDbName = `${testDbPrefix}${randomString(6, 10).toLowerCase()}_${Date.now()}`;
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		await dbConnection.migrate();
		await Container.get(AuthRolesService).init();
	}

	isInitialized = true;
}

/**
 * Postgres-only: create the per-file test DB (optionally cloning a template)
 * and open its connection, each step bounded by a timeout and retried with a
 * fresh DB name. Throws the last error if every attempt fails.
 */
async function initPostgresWithRetry(templateDb: string | undefined): Promise<void> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= PG_INIT_MAX_ATTEMPTS; attempt++) {
		const candidateDbName = `${testDbPrefix}${randomString(6, 10).toLowerCase()}_${Date.now()}`;

		try {
			const bootstrapPostgres = await withTimeout(
				new Connection(getBootstrapDBOptions()).initialize(),
				PG_INIT_STEP_TIMEOUT_MS,
				'Bootstrap Postgres connection',
			);
			try {
				const createQuery = templateDb
					? `CREATE DATABASE ${candidateDbName} TEMPLATE ${templateDb}`
					: `CREATE DATABASE ${candidateDbName}`;
				await withTimeout(
					bootstrapPostgres.query(createQuery),
					PG_INIT_STEP_TIMEOUT_MS,
					`CREATE DATABASE ${candidateDbName}`,
				);
			} finally {
				await bootstrapPostgres.destroy();
			}

			testDbName = candidateDbName;
			// Re-fetch GlobalConfig from the container each attempt: a prior
			// failed attempt's Container.reset() invalidates any earlier handle.
			Container.get(GlobalConfig).database.postgresdb.database = testDbName;

			const dbConnection = Container.get(DbConnection);
			await withTimeout(
				dbConnection.init(),
				PG_INIT_STEP_TIMEOUT_MS,
				`Open connection to test DB ${testDbName}`,
			);

			if (templateDb) {
				// Template already carries migrations + seeded roles — just mark state.
				dbConnection.connectionState.migrated = true;
			} else {
				await dbConnection.migrate();
				await Container.get(AuthRolesService).init();
			}

			return;
		} catch (error) {
			lastError = error;
			console.warn(
				`testDb.init() attempt ${attempt}/${PG_INIT_MAX_ATTEMPTS} failed:`,
				error instanceof Error ? error.message : error,
			);
			// Drop DI singletons (incl. a half-initialized DbConnection/DataSource)
			// so the next attempt rebuilds the whole chain from scratch.
			Container.reset();
			testDbName = undefined;
		}
	}

	throw new Error(
		`testDb.init() failed after ${PG_INIT_MAX_ATTEMPTS} attempts: ${
			lastError instanceof Error ? lastError.message : String(lastError)
		}`,
	);
}

/**
 * Build a Postgres template DB with all migrations + auth roles seeded.
 * Idempotent: drops any existing DB with the same name first.
 * Called from Jest globalSetup (orchestrator process) before workers fork —
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
