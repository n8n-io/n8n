import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'CreateExternalSecretsProviderTable1768840933000';

describe('CreateExternalSecretsProviderTable Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function tableExists(context: TestMigrationContext): Promise<boolean> {
		const tableName = 'external_secrets_provider';

		if (context.isSqlite) {
			const result = await context.queryRunner.query(
				`SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
				[tableName],
			);
			return result.length > 0;
		} else if (context.isPostgres) {
			const result = await context.queryRunner.query(
				`SELECT table_name FROM information_schema.tables WHERE table_name = $1`,
				[`${context.tablePrefix}${tableName}`],
			);
			return result.length > 0;
		} else if (context.isMysql) {
			const result = await context.queryRunner.query(
				`SELECT table_name FROM information_schema.tables WHERE table_name = ?`,
				[`${context.tablePrefix}${tableName}`],
			);
			return result.length > 0;
		}
		return false;
	}

	async function getTableColumns(
		context: TestMigrationContext,
	): Promise<Array<{ name: string; type: string }>> {
		const tableName = context.escape.tableName('external_secrets_provider');

		if (context.isSqlite) {
			const columns = await context.queryRunner.query(`PRAGMA table_info(${tableName})`);
			return columns.map((col: { name: string; type: string }) => ({
				name: col.name,
				type: col.type.toUpperCase(),
			}));
		} else if (context.isPostgres) {
			const columns = await context.queryRunner.query(
				`SELECT column_name as name, data_type as type
				 FROM information_schema.columns
				 WHERE table_name = $1`,
				[`${context.tablePrefix}external_secrets_provider`],
			);
			return columns.map((col: { name: string; type: string }) => ({
				name: col.name,
				type: col.type.toUpperCase(),
			}));
		} else if (context.isMysql) {
			const columns = await context.queryRunner.query(
				`SELECT column_name as name, data_type as type
				 FROM information_schema.columns
				 WHERE table_name = ?`,
				[`${context.tablePrefix}external_secrets_provider`],
			);
			return columns.map((col: { name: string; type: string }) => ({
				name: col.name,
				type: col.type.toUpperCase(),
			}));
		}
		return [];
	}

	async function insertProject(context: TestMigrationContext, projectId: string): Promise<void> {
		const projectTableName = context.escape.tableName('project');
		await context.queryRunner.query(
			`INSERT INTO ${projectTableName} (id, name, type, createdAt, updatedAt)
			 VALUES (?, ?, ?, ?, ?)`,
			[projectId, `Test Project ${projectId}`, 'team', new Date(), new Date()],
		);
	}

	describe('Schema Migration', () => {
		it('should create the external_secrets_provider table with all columns', async () => {
			// Run the migration
			await runSingleMigration(MIGRATION_NAME);

			// Create context after migration to verify schema
			const context = createTestMigrationContext(dataSource);

			// Verify table exists after migration
			const exists = await tableExists(context);
			expect(exists).toBe(true);

			// Verify all columns exist
			const columns = await getTableColumns(context);
			const columnNames = columns.map((c) => c.name);

			expect(columnNames).toContain('id');
			expect(columnNames).toContain('name');
			expect(columnNames).toContain('displayName');
			expect(columnNames).toContain('type');
			expect(columnNames).toContain('projectId');
			expect(columnNames).toContain('settings');
			expect(columnNames).toContain('connected');
			expect(columnNames).toContain('connectedAt');
			expect(columnNames).toContain('state');
			expect(columnNames).toContain('createdAt');
			expect(columnNames).toContain('updatedAt');

			await context.queryRunner.release();
		}, 60000);

		it('should enforce unique constraint on name and projectId combination', async () => {
			const context = createTestMigrationContext(dataSource);
			const tableName = context.escape.tableName('external_secrets_provider');

			// Insert projects first (foreign key dependency)
			await insertProject(context, 'project-1');
			await insertProject(context, 'project-2');

			// Insert first provider
			await context.queryRunner.query(
				`INSERT INTO ${tableName} (id, name, displayName, type, projectId, settings, connected, state, createdAt, updatedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					'test-id-1',
					'my-provider',
					'My Provider',
					'vault',
					'project-1',
					'{}',
					false,
					'initializing',
					new Date(),
					new Date(),
				],
			);

			// Attempt to insert duplicate name + projectId should fail
			const insertDuplicate = async () => {
				await context.queryRunner.query(
					`INSERT INTO ${tableName} (id, name, displayName, type, projectId, settings, connected, state, createdAt, updatedAt)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						'test-id-2',
						'my-provider',
						'My Provider 2',
						'vault',
						'project-1',
						'{}',
						false,
						'initializing',
						new Date(),
						new Date(),
					],
				);
			};

			await expect(insertDuplicate()).rejects.toThrow();

			// Same name with different projectId should succeed
			await context.queryRunner.query(
				`INSERT INTO ${tableName} (id, name, displayName, type, projectId, settings, connected, state, createdAt, updatedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					'test-id-3',
					'my-provider',
					'My Provider 3',
					'vault',
					'project-2',
					'{}',
					false,
					'initializing',
					new Date(),
					new Date(),
				],
			);

			// Verify both records exist
			const records = await context.queryRunner.query(
				`SELECT id FROM ${tableName} WHERE name = ?`,
				['my-provider'],
			);
			expect(records).toHaveLength(2);

			await context.queryRunner.release();
		});

		it('should allow null projectId for global providers', async () => {
			const context = createTestMigrationContext(dataSource);
			const tableName = context.escape.tableName('external_secrets_provider');

			// Insert global provider (null projectId)
			await context.queryRunner.query(
				`INSERT INTO ${tableName} (id, name, displayName, type, projectId, settings, connected, state, createdAt, updatedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					'global-provider-1',
					'global-vault',
					'Global Vault',
					'vault',
					null,
					'{}',
					false,
					'initializing',
					new Date(),
					new Date(),
				],
			);

			// Verify it was inserted
			const result = await context.queryRunner.query(
				`SELECT id, projectId FROM ${tableName} WHERE id = ?`,
				['global-provider-1'],
			);

			expect(result).toHaveLength(1);
			expect(result[0].projectId).toBeNull();

			await context.queryRunner.release();
		});

		it('should set correct default values', async () => {
			const context = createTestMigrationContext(dataSource);
			const tableName = context.escape.tableName('external_secrets_provider');

			// Insert with minimal required fields
			await context.queryRunner.query(
				`INSERT INTO ${tableName} (id, name, displayName, type, settings, createdAt, updatedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				['default-test-id', 'default-test', 'Default Test', 'vault', '{}', new Date(), new Date()],
			);

			const result = await context.queryRunner.query(
				`SELECT connected, state FROM ${tableName} WHERE id = ?`,
				['default-test-id'],
			);

			expect(result).toHaveLength(1);
			// SQLite stores boolean as 0/1
			expect(result[0].connected === false || result[0].connected === 0).toBe(true);
			expect(result[0].state).toBe('initializing');

			await context.queryRunner.release();
		});

		it('should drop table on rollback', async () => {
			const context = createTestMigrationContext(dataSource);

			// Verify table exists before rollback
			const existsBefore = await tableExists(context);
			expect(existsBefore).toBe(true);

			await context.queryRunner.release();

			// Run rollback
			await undoLastSingleMigration();

			// Create new context after rollback
			const postRollbackContext = createTestMigrationContext(dataSource);

			// Verify table no longer exists
			const existsAfter = await tableExists(postRollbackContext);
			expect(existsAfter).toBe(false);

			await postRollbackContext.queryRunner.release();
		});
	});
});
