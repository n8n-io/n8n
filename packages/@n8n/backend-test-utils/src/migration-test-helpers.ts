import { GlobalConfig } from '@n8n/config';
import { type DatabaseType, DbConnection, type Migration } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type ObjectLiteral, type QueryRunner } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

async function reinitializeDataConnection(): Promise<void> {
	const dbConnection = Container.get(DbConnection);
	await dbConnection.close();
	await dbConnection.init();
}

/**
 * Get the properly qualified migrations table name for the current database.
 */
function getMigrationsTableName(): string {
	const globalConfig = Container.get(GlobalConfig);
	const dbType = globalConfig.database.type;
	const tablePrefix = globalConfig.database.tablePrefix;

	if (dbType === 'postgresdb') {
		const schema = globalConfig.database.postgresdb.schema;
		return `${schema}."${tablePrefix}migrations"`;
	}
	return `"${tablePrefix}migrations"`;
}

/**
 * Test migration context with database-specific helpers (similar to MigrationContext).
 */
export interface TestMigrationContext {
	queryRunner: QueryRunner;
	tablePrefix: string;
	dbType: DatabaseType;
	isSqlite: boolean;
	isPostgres: boolean;
	escape: {
		columnName(name: string): string;
		tableName(name: string): string;
		indexName(name: string): string;
	};
	runQuery: <T = unknown>(sql: string, namedParameters?: ObjectLiteral) => Promise<T>;
}

/**
 * Create a test migration context with database-specific helpers.
 * Provides the same utilities that migrations have access to.
 */
export function createTestMigrationContext(dataSource: DataSource): TestMigrationContext {
	const globalConfig = Container.get(GlobalConfig);
	const dbType = globalConfig.database.type;
	const tablePrefix = globalConfig.database.tablePrefix;
	const queryRunner = dataSource.createQueryRunner();

	return {
		queryRunner,
		tablePrefix,
		dbType,
		isSqlite: dbType === 'sqlite',
		isPostgres: dbType === 'postgresdb',
		escape: {
			columnName: (name) => queryRunner.connection.driver.escape(name),
			tableName: (name) => queryRunner.connection.driver.escape(`${tablePrefix}${name}`),
			indexName: (name) => queryRunner.connection.driver.escape(`IDX_${tablePrefix}${name}`),
		},
		runQuery: async <T>(sql: string, namedParameters?: ObjectLiteral) => {
			if (namedParameters) {
				if (dbType === 'postgresdb') {
					// For PostgreSQL, convert named parameters to positional ($1, $2, etc.)
					// This handles JSON columns properly which don't work well with TypeORM's escapeQueryWithParameters
					// Use negative lookbehind to avoid matching PostgreSQL's :: cast operator
					let paramIndex = 1;
					const paramValues: unknown[] = [];
					const convertedSql = sql.replace(/(?<!:):(\w+)/g, (_, paramName: string) => {
						paramValues.push(namedParameters[paramName] as unknown);
						return `$${paramIndex++}`;
					});
					return (await queryRunner.query(convertedSql, paramValues)) as T;
				} else {
					// For MySQL/SQLite, use TypeORM's escapeQueryWithParameters
					const [query, parameters] = queryRunner.connection.driver.escapeQueryWithParameters(
						sql,
						namedParameters,
						{},
					);
					return (await queryRunner.query(query, parameters)) as T;
				}
			} else {
				return (await queryRunner.query(sql)) as T;
			}
		},
	};
}

/**
 * Initialize database and run all migrations up to (but not including) the specified migration.
 * Useful for testing data transformations by inserting test data before a migration runs.
 *
 * @param beforeMigrationName - The class name of the migration to stop before (e.g., 'AddUserRole1234567890')
 * @throws {UnexpectedError} If the migration is not found or database is not initialized
 */
export async function initDbUpToMigration(beforeMigrationName: string): Promise<void> {
	const dataSource = Container.get(DataSource);

	if (!Array.isArray(dataSource.options.migrations)) {
		throw new UnexpectedError('Database migrations are not an array');
	}

	const allMigrations = dataSource.options.migrations as Migration[];
	const targetIndex = allMigrations.findIndex((m) => m.name === beforeMigrationName);

	if (targetIndex === -1) {
		throw new UnexpectedError(`Migration "${beforeMigrationName}" not found`);
	}

	// Temporarily replace migrations array with subset
	const migrationsToRun = allMigrations.slice(0, targetIndex);
	(dataSource.options as { migrations: Migration[] }).migrations = migrationsToRun;

	try {
		// Need to reinitialize the data source to rebuild the migrations
		await reinitializeDataConnection();
		// Run migrations
		await Container.get(DbConnection).migrate();
	} finally {
		// Restore full migrations array
		(dataSource.options as { migrations: Migration[] }).migrations = allMigrations;
		// Need to reinitialize the data source to rebuild the migrations
		await reinitializeDataConnection();
	}
}

/**
 * Undo the last single migration down.
 * Useful for testing the down path of a specific migration after inserting test data.
 */
export async function undoLastSingleMigration(): Promise<void> {
	const dataSource = Container.get(DataSource);

	// Get the last executed migration from the migrations table
	const executedMigrations = await dataSource.query<Array<{ name: string }>>(
		`SELECT * FROM ${getMigrationsTableName()} ORDER BY timestamp DESC LIMIT 1`,
	);

	if (executedMigrations.length === 0) {
		throw new UnexpectedError('No migrations found to undo');
	}

	const lastMigrationName = executedMigrations[0].name;

	// Find the migration class by name
	type MigrationConstructor = new () => { transaction?: false };
	type MigrationClass = MigrationConstructor & {
		prototype?: { transaction?: false; __n8n_wrapped?: boolean };
		name: string;
	};
	const migration = (dataSource.options.migrations as MigrationClass[]).find(
		(m) => m.name === lastMigrationName,
	);

	// Create an instance to check the transaction property (class fields are on instances, not prototypes)
	let hasTransactionDisabled = false;
	if (migration) {
		const instance = new migration();
		hasTransactionDisabled = instance.transaction === false;
	}

	// Use transaction: 'none' for migrations with transaction = false, otherwise use 'each'
	await dataSource.undoLastMigration({
		transaction: hasTransactionDisabled ? 'none' : 'each',
	});
}

/**
 * Run a single migration by name.
 * Useful for testing a specific migration after inserting test data.
 *
 * @param migrationName - The class name of the migration to run (e.g., 'AddUserRole1234567890')
 * @throws {UnexpectedError} If the migration is not found or database is not initialized
 */
export async function runSingleMigration(migrationName: string): Promise<void> {
	const dataSource = Container.get(DataSource);

	const allMigrations = dataSource.options.migrations as Migration[];
	const migration = allMigrations.find((m) => m.name === migrationName);

	if (!migration) {
		throw new UnexpectedError(`Migration "${migrationName}" not found`);
	}

	// Temporarily replace migrations array with only the target migration
	(dataSource.options as { migrations: Migration[] }).migrations = [migration];

	try {
		// Need to reinitialize the data source to rebuild the migrations
		await reinitializeDataConnection();
		// Run migrations
		await Container.get(DbConnection).migrate();
	} finally {
		// Restore full migrations array
		(dataSource.options as { migrations: Migration[] }).migrations = allMigrations;
		// Need to reinitialize the data source to rebuild the migrations
		await reinitializeDataConnection();
	}
}
