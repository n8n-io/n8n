import { initDbUpToMigration, runSingleMigration } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

describe('Migration Test Helpers', () => {
	let dataSource: DataSource;

	/**
	 * Get the properly qualified migrations table name for the current database
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

	beforeEach(async () => {
		// Initialize connection without running migrations
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	afterEach(async () => {
		// Clean up the migrations table
		const globalConfig = Container.get(GlobalConfig);
		if (globalConfig.database.type === 'postgresdb') {
			try {
				await dataSource.query(`TRUNCATE ${getMigrationsTableName()} CASCADE`);
			} catch {
				// Ignore errors if table doesn't exist
			}
		}

		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	describe('initDbUpToMigration', () => {
		it('should throw error if migration not found', async () => {
			await expect(initDbUpToMigration('NonExistentMigration')).rejects.toThrow(
				new UnexpectedError('Migration "NonExistentMigration" not found'),
			);
		});

		it('should stop before specified migration', async () => {
			const migrations = dataSource.options.migrations as Array<{ name: string }>;
			expect(migrations.length).toBeGreaterThan(1);

			const secondMigrationName = migrations[1].name;
			console.log('Running migrations up to ' + secondMigrationName);
			await initDbUpToMigration(secondMigrationName);
			console.log('Migrations executed up to ' + secondMigrationName);

			// Verify only first migration was executed
			const executed = await dataSource.query(
				`SELECT * FROM ${getMigrationsTableName()} ORDER BY timestamp`,
			);
			expect(executed).toHaveLength(1);
			expect(executed[0].name).toBe(migrations[0].name);
		});
	});

	describe('runSingleMigration', () => {
		it('should throw error if migration not found', async () => {
			await expect(runSingleMigration('NonExistentMigration')).rejects.toThrow(
				new UnexpectedError('Migration "NonExistentMigration" not found'),
			);
		});

		it('should run specific migration', async () => {
			const migrations = dataSource.options.migrations as Array<{ name: string }>;
			expect(migrations.length).toBeGreaterThan(1);

			const secondMigrationName = migrations[1].name;
			console.log('Running migrations up to ' + secondMigrationName);
			await initDbUpToMigration(secondMigrationName);
			console.log('Migrations executed up to ' + secondMigrationName);

			await runSingleMigration(secondMigrationName);

			const executed = await dataSource.query(
				`SELECT * FROM ${getMigrationsTableName()} ORDER BY timestamp`,
			);
			expect(executed).toHaveLength(2);
			expect(executed[0].name).toBe(migrations[0].name);
			expect(executed[1].name).toBe(secondMigrationName);
		});
	});
});
