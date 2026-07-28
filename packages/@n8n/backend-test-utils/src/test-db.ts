import { GlobalConfig } from '@n8n/config';
import type { entities } from '@n8n/db';
import { AuthRolesService, DbConnection, DbConnectionOptions } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataSourceOptions } from '@n8n/typeorm';
import { DataSource as Connection } from '@n8n/typeorm';
import assert from 'assert';
import { randomString } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

type SqliteTemplate = { dbPath: string; templatePath: string };

/**
 * SQLite fast path: the first suite to migrate on this machine snapshots its DB
 * file into a machine-wide template dir; later suites (any process, any run)
 * copy the snapshot instead of replaying every migration. The template lives in
 * `os.tmpdir()` — like the per-suite test dirs — so it is shared across
 * worktrees and the OS eventually cleans it up. Keyed by table prefix plus each
 * migration's name and compiled source, so adding, removing, or editing a
 * migration invalidates the template naturally. Set
 * `N8N_TEST_SQLITE_TEMPLATE=false` to bypass for debugging.
 */
function getSqliteTemplate(options: DataSourceOptions): SqliteTemplate | undefined {
	if (options.type !== 'sqlite-pooled') return undefined;
	if (process.env.N8N_TEST_SQLITE_TEMPLATE === 'false') return undefined;
	if (!Array.isArray(options.migrations) || options.migrations.length === 0) return undefined;

	const hash = createHash('sha256').update(options.entityPrefix ?? '');
	for (const migration of options.migrations) {
		hash.update(
			typeof migration === 'string' ? migration : `${migration.name}\n${String(migration)}`,
		);
	}

	return {
		dbPath: options.database,
		templatePath: path.join(
			tmpdir(),
			'n8n-test-db-templates',
			`${hash.digest('hex').slice(0, 24)}.sqlite`,
		),
	};
}

/** Seed the per-process DB file from the template. Returns false if there is no usable template. */
function restoreSqliteTemplate({ dbPath, templatePath }: SqliteTemplate): boolean {
	if (!existsSync(templatePath)) return false;
	try {
		mkdirSync(path.dirname(dbPath), { recursive: true });
		// A leftover WAL/SHM pair from a previous connection to this path must not
		// be replayed on top of the freshly copied file.
		rmSync(`${dbPath}-wal`, { force: true });
		rmSync(`${dbPath}-shm`, { force: true });
		copyFileSync(templatePath, dbPath);
		return true;
	} catch (error) {
		console.warn('Failed to restore sqlite test DB from template:', error);
		rmSync(dbPath, { force: true });
		return false;
	}
}

async function saveSqliteTemplate({ templatePath }: SqliteTemplate): Promise<void> {
	try {
		mkdirSync(path.dirname(templatePath), { recursive: true });
		// Stage in a temp path and rename() into place so racing cold processes
		// never observe a half-written template; race losers overwrite it with
		// identical content. VACUUM INTO writes a compact, self-contained snapshot
		// while the pooled connection stays open — copying the live DB file would
		// miss whatever still sits in the WAL (the pooled driver keeps the -wal
		// file around even across close()).
		const stagingPath = `${templatePath}.${process.pid}-${randomString(8)}.tmp`;
		await Container.get(Connection).query(`VACUUM INTO '${stagingPath}'`);
		renameSync(stagingPath, templatePath);
	} catch (error) {
		console.warn('Failed to save sqlite test DB template:', error);
	}
}

/**
 * Initialize one test DB per suite run, with bootstrap connection if needed.
 *
 * When `N8N_TEST_TEMPLATE_DB` is set (Postgres only), the new test DB is created
 * via `CREATE DATABASE ... TEMPLATE <name>`, which clones the schema as a file
 * copy and skips the multi-second migration replay per file.
 *
 * On SQLite, the same idea runs automatically via a machine-wide template file:
 * see {@link getSqliteTemplate}.
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
	const sqliteTemplate = dbType === 'sqlite' ? getSqliteTemplate(dbConnection.options) : undefined;
	const restoredFromTemplate =
		sqliteTemplate !== undefined && restoreSqliteTemplate(sqliteTemplate);

	await dbConnection.init();

	if (templateDb) {
		// Template already carries migrations + seeded roles — just mark state.
		dbConnection.connectionState.migrated = true;
	} else {
		// After a sqlite template restore both calls are fast no-ops: the copied
		// migrations table satisfies the executor's by-name pending check, and the
		// roles sync finds everything in place (healing any drift in role/scope
		// definitions, which change without a migration).
		await dbConnection.migrate();
		await Container.get(AuthRolesService).init();
		if (sqliteTemplate && !restoredFromTemplate) {
			await saveSqliteTemplate(sqliteTemplate);
		}
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
	// AuthRolesService, …). With persistent Vitest workers (no per-file process
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
	| 'TrustedKeyEntity'
	| 'WorkflowStatisticsDelta';

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
		// `workflow_statistics_delta` is a raw-SQL, Postgres-only table with no TypeORM entity, so it
		// can't go through the repository, so we clear it directly.
		if (name === 'WorkflowStatisticsDelta') {
			const { type, tablePrefix } = Container.get(GlobalConfig).database;
			if (type === 'postgresdb') {
				const table = connection.driver.escape(`${tablePrefix}workflow_statistics_delta`);
				await connection.query(`DELETE FROM ${table}`);
			}
			continue;
		}
		await connection.getRepository(name).delete({});
	}
}
