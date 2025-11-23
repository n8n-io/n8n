import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	testModules,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BOUNDARY_TEST_VALUES, insertPreMigrationRawData } from './migration-test-setup';

const MIGRATION_NAME = 'ChangeValueTypesForInsights1759399811000';

describe('ChangeValueTypesForInsights - insights_raw table', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await testModules.loadModules(['insights']);

		// Initialize DB connection without running migrations
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		// Run migrations up to (but not including) target migration
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	describe('Schema Migration', () => {
		it('should change value column from INT to BIGINT', async () => {
			// Create migration context for schema queries
			const context = createTestMigrationContext(dataSource);

			// Create prerequisite data for foreign keys using direct SQL
			const projectTableName = context.escape.tableName('project');
			await context.queryRunner.query(
				`INSERT INTO ${projectTableName} (id, name, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
				['test-project-id', 'Test Project', 'personal', new Date(), new Date()],
			);

			const workflowTableName = context.escape.tableName('workflow_entity');
			await context.queryRunner.query(
				`INSERT INTO ${workflowTableName} (id, name, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
				['test-workflow-id', 'Test Workflow', false, new Date(), new Date()],
			);

			// Insert test metadata (required for foreign key)
			const metaTableName = context.escape.tableName('insights_metadata');
			await context.queryRunner.query(
				`INSERT INTO ${metaTableName} (workflowId, projectId, workflowName, projectName) VALUES (?, ?, ?, ?)`,
				['test-workflow-id', 'test-project-id', 'Test Workflow', 'Test Project'],
			);
			const [metaRow] = await context.queryRunner.query(
				`SELECT metaId FROM ${metaTableName} LIMIT 1`,
			);
			const metaId = metaRow.metaId;

			// Insert test data in old INT schema
			const testValues = [
				BOUNDARY_TEST_VALUES.zero,
				BOUNDARY_TEST_VALUES.negativeOne,
				BOUNDARY_TEST_VALUES.positiveOne,
				BOUNDARY_TEST_VALUES.intMax,
				BOUNDARY_TEST_VALUES.intMin,
			];
			await insertPreMigrationRawData(context, metaId, testValues);

			// Capture data before migration using SQL
			const insightsRawTableName = context.escape.tableName('insights_raw');
			const beforeData = await context.queryRunner.query(
				`SELECT id, metaId, value FROM ${insightsRawTableName} ORDER BY id ASC`,
			);
			expect(beforeData).toHaveLength(testValues.length);

			// Run the migration
			await runSingleMigration(MIGRATION_NAME);

			// Release old query runner before creating new one
			await context.queryRunner.release();

			// Create fresh context after migration (dataSource is reinitialized)
			const postMigrationContext = createTestMigrationContext(dataSource);

			// Verify schema change based on database type
			if (postMigrationContext.isSqlite) {
				const result = await postMigrationContext.queryRunner.query(
					`PRAGMA table_info(${insightsRawTableName})`,
				);
				const valueColumn = result.find((col: { name: string }) => col.name === 'value');
				expect(valueColumn).toBeDefined();
				expect(valueColumn.type.toLowerCase()).toContain('bigint');
			} else if (postMigrationContext.isPostgres) {
				const result = await postMigrationContext.queryRunner.query(
					`SELECT data_type FROM information_schema.columns
					WHERE table_name = ${insightsRawTableName} AND column_name = 'value'`,
				);
				expect(result[0].data_type).toBe('bigint');
			} else if (postMigrationContext.isMysql) {
				const result = await postMigrationContext.queryRunner.query(
					`SHOW COLUMNS FROM ${insightsRawTableName} LIKE 'value'`,
				);
				expect(result[0].Type.toLowerCase()).toContain('bigint');
			}

			// Verify data integrity after migration using SQL
			const afterData = await postMigrationContext.queryRunner.query(
				`SELECT id, metaId, value FROM ${insightsRawTableName} ORDER BY id ASC`,
			);
			expect(afterData).toHaveLength(beforeData.length);

			// Verify all values are preserved exactly
			afterData.forEach(
				(afterRow: { id: number; metaId: number; value: number }, index: number) => {
					expect(afterRow.value).toBe(beforeData[index].value);
					expect(afterRow.metaId).toBe(beforeData[index].metaId);
				},
			);

			// Cleanup
			await postMigrationContext.queryRunner.release();
		});
	});

	describe('Post-Migration Capacity', () => {
		it('should accept values exceeding INT range', async () => {
			const context = createTestMigrationContext(dataSource);

			// Get metaId from existing metadata
			const metaTableName = context.escape.tableName('insights_metadata');
			const [metaRow] = await context.queryRunner.query(
				`SELECT metaId FROM ${metaTableName} LIMIT 1`,
			);
			const metaId = metaRow.metaId;

			// Insert value exceeding INT32 max
			const beyondIntValue = BOUNDARY_TEST_VALUES.beyondInt;
			const insightsRawTableName = context.escape.tableName('insights_raw');
			await context.queryRunner.query(
				`INSERT INTO ${insightsRawTableName} (metaId, type, value, timestamp) VALUES (?, ?, ?, ?)`,
				[metaId, 0, beyondIntValue, new Date()],
			);

			// Verify retrieval using SQL
			const [result] = await context.queryRunner.query(
				`SELECT id, metaId, value FROM ${insightsRawTableName} WHERE value = ?`,
				[beyondIntValue],
			);

			expect(result).toBeDefined();
			expect(result.value).toBe(beyondIntValue);

			// Cleanup
			await context.queryRunner.release();
		});
	});
});
