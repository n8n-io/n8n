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
import { nanoid } from 'nanoid';

const MIGRATION_NAME = 'ChangeWorkflowStatisticsFKToNoAction1767018516000';

/**
 * Generate parameter placeholders for a given context and count.
 * PostgreSQL uses $1, $2, ... while MySQL/SQLite use ?
 */
function getParamPlaceholders(context: TestMigrationContext, count: number): string {
	if (context.isPostgres) {
		return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');
	}
	return Array.from({ length: count }, () => '?').join(', ');
}

/**
 * Generate a single parameter placeholder for WHERE clauses
 */
function getParamPlaceholder(context: TestMigrationContext, index = 1): string {
	return context.isPostgres ? `$${index}` : '?';
}

describe('ChangeWorkflowStatisticsFKToNoAction Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
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

	/**
	 * Helper function to insert a test workflow
	 */
	async function insertTestWorkflow(
		context: TestMigrationContext,
		workflowId: string,
		workflowName = 'Test Workflow',
	): Promise<void> {
		const tableName = context.escape.tableName('workflow_entity');
		const idColumn = context.escape.columnName('id');
		const nameColumn = context.escape.columnName('name');
		const activeColumn = context.escape.columnName('active');
		const nodesColumn = context.escape.columnName('nodes');
		const connectionsColumn = context.escape.columnName('connections');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');
		const triggerCountColumn = context.escape.columnName('triggerCount');
		const versionIdColumn = context.escape.columnName('versionId');

		const versionId = nanoid();
		const placeholders = getParamPlaceholders(context, 9);
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${idColumn}, ${nameColumn}, ${activeColumn}, ${nodesColumn}, ${connectionsColumn}, ${createdAtColumn}, ${updatedAtColumn}, ${triggerCountColumn}, ${versionIdColumn}) VALUES (${placeholders})`,
			[workflowId, workflowName, false, '[]', '{}', new Date(), new Date(), 0, versionId],
		);
	}

	/**
	 * Helper function to insert workflow statistics (before migration, without workflowName)
	 */
	async function insertWorkflowStatistics(
		context: TestMigrationContext,
		workflowId: string,
		name: string,
		count: number,
	): Promise<void> {
		const tableName = context.escape.tableName('workflow_statistics');
		const workflowIdColumn = context.escape.columnName('workflowId');
		const nameColumn = context.escape.columnName('name');
		const countColumn = context.escape.columnName('count');
		const latestEventColumn = context.escape.columnName('latestEvent');
		const rootCountColumn = context.escape.columnName('rootCount');

		const placeholders = getParamPlaceholders(context, 5);
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${workflowIdColumn}, ${nameColumn}, ${countColumn}, ${latestEventColumn}, ${rootCountColumn}) VALUES (${placeholders})`,
			[workflowId, name, count, new Date(), 0],
		);
	}

	/**
	 * Helper function to insert workflow statistics (after migration, with workflowName)
	 */
	async function insertWorkflowStatisticsWithName(
		context: TestMigrationContext,
		workflowId: string,
		name: string,
		count: number,
		workflowName: string,
	): Promise<void> {
		const tableName = context.escape.tableName('workflow_statistics');
		const workflowIdColumn = context.escape.columnName('workflowId');
		const nameColumn = context.escape.columnName('name');
		const countColumn = context.escape.columnName('count');
		const latestEventColumn = context.escape.columnName('latestEvent');
		const rootCountColumn = context.escape.columnName('rootCount');
		const workflowNameColumn = context.escape.columnName('workflowName');

		const placeholders = getParamPlaceholders(context, 6);
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${workflowIdColumn}, ${nameColumn}, ${countColumn}, ${latestEventColumn}, ${rootCountColumn}, ${workflowNameColumn}) VALUES (${placeholders})`,
			[workflowId, name, count, new Date(), 0, workflowName],
		);
	}

	/**
	 * Helper function to get workflow statistics by workflowId
	 */
	async function getWorkflowStatistics(
		context: TestMigrationContext,
		workflowId: string,
	): Promise<
		Array<{ workflowId: string; name: string; count: number; workflowName?: string | null }>
	> {
		const tableName = context.escape.tableName('workflow_statistics');
		const workflowIdColumn = context.escape.columnName('workflowId');
		const nameColumn = context.escape.columnName('name');
		const countColumn = context.escape.columnName('count');

		const placeholder = getParamPlaceholder(context);
		return await context.queryRunner.query(
			`SELECT ${workflowIdColumn} as "workflowId", ${nameColumn} as "name", ${countColumn} as "count" FROM ${tableName} WHERE ${workflowIdColumn} = ${placeholder}`,
			[workflowId],
		);
	}

	/**
	 * Helper function to get workflow statistics by workflowId (after migration, includes workflowName)
	 */
	async function getWorkflowStatisticsWithName(
		context: TestMigrationContext,
		workflowId: string,
	): Promise<
		Array<{ workflowId: string; name: string; count: number; workflowName: string | null }>
	> {
		const tableName = context.escape.tableName('workflow_statistics');
		const workflowIdColumn = context.escape.columnName('workflowId');
		const nameColumn = context.escape.columnName('name');
		const countColumn = context.escape.columnName('count');
		const workflowNameColumn = context.escape.columnName('workflowName');

		const placeholder = getParamPlaceholder(context);
		return await context.queryRunner.query(
			`SELECT ${workflowIdColumn} as "workflowId", ${nameColumn} as "name", ${countColumn} as "count", ${workflowNameColumn} as "workflowName" FROM ${tableName} WHERE ${workflowIdColumn} = ${placeholder}`,
			[workflowId],
		);
	}

	/**
	 * Helper function to get workflow statistics by name (for finding orphaned rows)
	 */
	async function getWorkflowStatisticsByName(
		context: TestMigrationContext,
		name: string,
	): Promise<
		Array<{ workflowId: string | null; name: string; count: number; workflowName: string | null }>
	> {
		const tableName = context.escape.tableName('workflow_statistics');
		const workflowIdColumn = context.escape.columnName('workflowId');
		const nameColumn = context.escape.columnName('name');
		const countColumn = context.escape.columnName('count');
		const workflowNameColumn = context.escape.columnName('workflowName');

		const placeholder = getParamPlaceholder(context);
		return await context.queryRunner.query(
			`SELECT ${workflowIdColumn} as "workflowId", ${nameColumn} as "name", ${countColumn} as "count", ${workflowNameColumn} as "workflowName" FROM ${tableName} WHERE ${nameColumn} = ${placeholder}`,
			[name],
		);
	}

	/**
	 * Helper function to delete a workflow
	 */
	async function deleteWorkflow(context: TestMigrationContext, workflowId: string): Promise<void> {
		const tableName = context.escape.tableName('workflow_entity');
		const idColumn = context.escape.columnName('id');

		const placeholder = getParamPlaceholder(context);
		await context.queryRunner.query(`DELETE FROM ${tableName} WHERE ${idColumn} = ${placeholder}`, [
			workflowId,
		]);
	}

	it('should preserve statistics after workflow deletion (no FK constraint) and CASCADE after rollback', async () => {
		// Debug: Check schema BEFORE migration
		const contextBefore = createTestMigrationContext(dataSource);
		await contextBefore.queryRunner.release();

		// Run the actual migration
		await runSingleMigration(MIGRATION_NAME);

		// Create context AFTER migration runs (since runSingleMigration reinitializes the connection)
		dataSource = Container.get(DataSource);
		let context = createTestMigrationContext(dataSource);

		// Test that statistics are preserved when workflow is deleted (no FK constraint behavior)
		const testWorkflowId = nanoid();
		const uniqueStatName = `test_stat_${nanoid()}`;
		const testWorkflowName = 'My Test Workflow';

		await insertTestWorkflow(context, testWorkflowId, testWorkflowName);
		await insertWorkflowStatisticsWithName(
			context,
			testWorkflowId,
			uniqueStatName,
			3,
			testWorkflowName,
		);

		// Verify statistics exist
		const beforeDelete = await getWorkflowStatistics(context, testWorkflowId);
		expect(beforeDelete).toHaveLength(1);
		expect(beforeDelete[0].workflowId).toBe(testWorkflowId);

		// Delete workflow - statistics should remain unchanged (no FK constraint)
		await deleteWorkflow(context, testWorkflowId);

		// Verify statistics still exist with the same workflowId (orphaned reference)
		// workflowName should be preserved for identifying the deleted workflow
		const afterDelete = await getWorkflowStatisticsByName(context, uniqueStatName);
		expect(afterDelete).toHaveLength(1);
		expect(afterDelete[0].workflowId).toBe(testWorkflowId); // workflowId is unchanged
		expect(afterDelete[0].count).toBe(3);
		expect(afterDelete[0].workflowName).toBe(testWorkflowName);

		// Cleanup statistics for this test
		const statsTable = context.escape.tableName('workflow_statistics');
		const nameCol = context.escape.columnName('name');
		const placeholder = getParamPlaceholder(context);
		await context.queryRunner.query(`DELETE FROM ${statsTable} WHERE ${nameCol} = ${placeholder}`, [
			uniqueStatName,
		]);
		await context.queryRunner.release();

		// Rollback the migration
		await undoLastSingleMigration();

		// Create new context after rollback
		dataSource = Container.get(DataSource);
		context = createTestMigrationContext(dataSource);

		// Test CASCADE behavior after rollback
		const cascadeWorkflowId = nanoid();

		await insertTestWorkflow(context, cascadeWorkflowId);
		await insertWorkflowStatistics(context, cascadeWorkflowId, 'manual_success', 2);

		// Verify statistics exist
		const beforeCascadeDelete = await getWorkflowStatistics(context, cascadeWorkflowId);
		expect(beforeCascadeDelete).toHaveLength(1);

		// Delete workflow - should CASCADE
		await deleteWorkflow(context, cascadeWorkflowId);

		// Verify statistics were deleted
		const afterCascadeDelete = await getWorkflowStatistics(context, cascadeWorkflowId);
		expect(afterCascadeDelete).toHaveLength(0);

		await context.queryRunner.release();
	});

	it('should preserve statistics with different workflowIds after deleting multiple workflows', async () => {
		// Run the actual migration
		await runSingleMigration(MIGRATION_NAME);

		// Create context AFTER migration runs
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);

		// Create multiple workflows with the same statistic name but different workflow names
		const workflowId1 = nanoid();
		const workflowId2 = nanoid();
		const workflowId3 = nanoid();
		const workflowName1 = 'Workflow Alpha';
		const workflowName2 = 'Workflow Beta';
		const workflowName3 = 'Workflow Gamma';

		await insertTestWorkflow(context, workflowId1, workflowName1);
		await insertTestWorkflow(context, workflowId2, workflowName2);
		await insertTestWorkflow(context, workflowId3, workflowName3);

		// All workflows have 'manual_success' statistics (inserted after migration with workflowName)
		await insertWorkflowStatisticsWithName(
			context,
			workflowId1,
			'manual_success',
			10,
			workflowName1,
		);
		await insertWorkflowStatisticsWithName(
			context,
			workflowId2,
			'manual_success',
			20,
			workflowName2,
		);
		await insertWorkflowStatisticsWithName(
			context,
			workflowId3,
			'manual_success',
			30,
			workflowName3,
		);

		// Delete all workflows - statistics should remain unchanged (no FK constraint)
		await deleteWorkflow(context, workflowId1);
		await deleteWorkflow(context, workflowId2);
		await deleteWorkflow(context, workflowId3);

		// Verify all statistics still exist with their original workflowId values (orphaned references)
		const orphanedStats = await getWorkflowStatisticsByName(context, 'manual_success');
		expect(orphanedStats.length).toBeGreaterThanOrEqual(3);

		// Find our specific test statistics by workflowId
		const stat1 = orphanedStats.find((s) => s.workflowId === workflowId1);
		const stat2 = orphanedStats.find((s) => s.workflowId === workflowId2);
		const stat3 = orphanedStats.find((s) => s.workflowId === workflowId3);

		// Verify workflowIds are preserved (not set to NULL)
		expect(stat1).toBeDefined();
		expect(stat1?.workflowId).toBe(workflowId1);
		expect(stat1?.count).toBe(10);
		expect(stat1?.workflowName).toBe(workflowName1);

		expect(stat2).toBeDefined();
		expect(stat2?.workflowId).toBe(workflowId2);
		expect(stat2?.count).toBe(20);
		expect(stat2?.workflowName).toBe(workflowName2);

		expect(stat3).toBeDefined();
		expect(stat3?.workflowId).toBe(workflowId3);
		expect(stat3?.count).toBe(30);
		expect(stat3?.workflowName).toBe(workflowName3);

		// Cleanup - delete our test statistics
		const statsTable = context.escape.tableName('workflow_statistics');
		const workflowIdCol = context.escape.columnName('workflowId');
		const placeholder = getParamPlaceholder(context);
		await context.queryRunner.query(
			`DELETE FROM ${statsTable} WHERE ${workflowIdCol} IN (${placeholder}, ${getParamPlaceholder(context, 2)}, ${getParamPlaceholder(context, 3)})`,
			[workflowId1, workflowId2, workflowId3],
		);
		await context.queryRunner.release();

		// Rollback for next test
		await undoLastSingleMigration();
	});

	it('should preserve existing workflow statistics data and populate workflowName during migration', async () => {
		// The database is already in pre-migration state from the previous test's rollback
		let context = createTestMigrationContext(dataSource);
		const workflowId = nanoid();
		const testWorkflowName = 'Statistics Test Workflow';

		// Create workflow and statistics before migration
		await insertTestWorkflow(context, workflowId, testWorkflowName);
		await insertWorkflowStatistics(context, workflowId, 'manual_success', 100);
		await insertWorkflowStatistics(context, workflowId, 'production_success', 200);
		await insertWorkflowStatistics(context, workflowId, 'production_error', 5);

		// Verify initial data (workflowName column doesn't exist yet)
		const beforeMigration = await getWorkflowStatistics(context, workflowId);
		expect(beforeMigration).toHaveLength(3);
		await context.queryRunner.release();

		// Run the actual migration
		await runSingleMigration(MIGRATION_NAME);

		// Create new context after migration (since runSingleMigration reinitializes the connection)
		dataSource = Container.get(DataSource);
		context = createTestMigrationContext(dataSource);

		// Verify data is preserved after migration and workflowName is populated
		const afterMigration = await getWorkflowStatisticsWithName(context, workflowId);
		expect(afterMigration).toHaveLength(3);

		// Verify specific values including workflowName
		const manualSuccess = afterMigration.find((s) => s.name === 'manual_success');
		const productionSuccess = afterMigration.find((s) => s.name === 'production_success');
		const productionError = afterMigration.find((s) => s.name === 'production_error');

		expect(manualSuccess?.count).toBe(100);
		expect(manualSuccess?.workflowName).toBe(testWorkflowName);
		expect(productionSuccess?.count).toBe(200);
		expect(productionSuccess?.workflowName).toBe(testWorkflowName);
		expect(productionError?.count).toBe(5);
		expect(productionError?.workflowName).toBe(testWorkflowName);

		// Cleanup - delete statistics first (they have FK), then workflow
		const statsTable = context.escape.tableName('workflow_statistics');
		const workflowIdCol = context.escape.columnName('workflowId');
		const placeholder = getParamPlaceholder(context);
		await context.queryRunner.query(
			`DELETE FROM ${statsTable} WHERE ${workflowIdCol} = ${placeholder}`,
			[workflowId],
		);
		await deleteWorkflow(context, workflowId);

		await context.queryRunner.release();
	});

	it('should delete orphaned statistics during rollback before restoring FK constraint', async () => {
		// The database is already in post-migration state from the previous test
		// We need to rollback first, then run the migration again
		await undoLastSingleMigration();
		await runSingleMigration(MIGRATION_NAME);

		// Create context AFTER migration runs
		dataSource = Container.get(DataSource);
		let context = createTestMigrationContext(dataSource);

		// Create workflows with statistics using unique stat names to avoid conflicts
		const orphanedWorkflowId1 = nanoid();
		const orphanedWorkflowId2 = nanoid();
		const keepWorkflowId = nanoid();
		const uniqueStatName1 = `orphan_stat_1_${nanoid()}`;
		const uniqueStatName2 = `orphan_stat_2_${nanoid()}`;
		const uniqueStatName3 = `keep_stat_${nanoid()}`;

		await insertTestWorkflow(context, orphanedWorkflowId1, 'Workflow to Delete 1');
		await insertTestWorkflow(context, orphanedWorkflowId2, 'Workflow to Delete 2');
		await insertTestWorkflow(context, keepWorkflowId, 'Workflow to Keep');

		await insertWorkflowStatisticsWithName(
			context,
			orphanedWorkflowId1,
			uniqueStatName1,
			100,
			'Workflow to Delete 1',
		);
		await insertWorkflowStatisticsWithName(
			context,
			orphanedWorkflowId2,
			uniqueStatName2,
			200,
			'Workflow to Delete 2',
		);
		await insertWorkflowStatisticsWithName(
			context,
			keepWorkflowId,
			uniqueStatName3,
			300,
			'Workflow to Keep',
		);

		// Delete some workflows to create orphaned statistics
		await deleteWorkflow(context, orphanedWorkflowId1);
		await deleteWorkflow(context, orphanedWorkflowId2);

		// Verify orphaned statistics still exist after workflow deletion (no FK constraint)
		const beforeRollback1 = await getWorkflowStatisticsByName(context, uniqueStatName1);
		expect(beforeRollback1).toHaveLength(1);
		expect(beforeRollback1[0].workflowId).toBe(orphanedWorkflowId1);

		const beforeRollback2 = await getWorkflowStatisticsByName(context, uniqueStatName2);
		expect(beforeRollback2).toHaveLength(1);
		expect(beforeRollback2[0].workflowId).toBe(orphanedWorkflowId2);

		// Verify non-orphaned statistics still exist
		const beforeRollbackKeep = await getWorkflowStatistics(context, keepWorkflowId);
		expect(beforeRollbackKeep).toHaveLength(1);

		await context.queryRunner.release();

		// Rollback the migration - orphaned statistics should be deleted
		await undoLastSingleMigration();

		// Create new context after rollback
		dataSource = Container.get(DataSource);
		context = createTestMigrationContext(dataSource);

		// Verify orphaned statistics were deleted during rollback (workflowName column no longer exists)
		const statsTable = context.escape.tableName('workflow_statistics');
		const nameCol = context.escape.columnName('name');
		const workflowIdCol = context.escape.columnName('workflowId');
		const placeholder = getParamPlaceholder(context);

		const afterRollback1 = await context.queryRunner.query(
			`SELECT ${workflowIdCol} as "workflowId" FROM ${statsTable} WHERE ${nameCol} = ${placeholder}`,
			[uniqueStatName1],
		);
		expect(afterRollback1).toHaveLength(0);

		const afterRollback2 = await context.queryRunner.query(
			`SELECT ${workflowIdCol} as "workflowId" FROM ${statsTable} WHERE ${nameCol} = ${placeholder}`,
			[uniqueStatName2],
		);
		expect(afterRollback2).toHaveLength(0);

		// Verify non-orphaned statistics still exist after rollback
		const afterRollbackKeep = await getWorkflowStatistics(context, keepWorkflowId);
		expect(afterRollbackKeep).toHaveLength(1);
		expect(afterRollbackKeep[0].workflowId).toBe(keepWorkflowId);
		expect(afterRollbackKeep[0].count).toBe(300);

		// Cleanup - reuse the existing variable declarations
		await context.queryRunner.query(
			`DELETE FROM ${statsTable} WHERE ${workflowIdCol} = ${placeholder}`,
			[keepWorkflowId],
		);
		await deleteWorkflow(context, keepWorkflowId);

		await context.queryRunner.release();
	});

	it('should reset overflowing values to 0 during rollback before converting BIGINT to INTEGER (PostgreSQL only)', async () => {
		// Run the migration to enable BIGINT columns
		await runSingleMigration(MIGRATION_NAME);

		// Create context AFTER migration runs
		dataSource = Container.get(DataSource);
		let context = createTestMigrationContext(dataSource);

		// Skip this test for SQLite - SQLite handles INTEGER overflow differently
		if (!context.isPostgres) {
			await context.queryRunner.release();
			return;
		}

		const workflowId = nanoid();
		const testWorkflowName = 'Overflow Test Workflow';
		const uniqueStatName = `overflow_stat_${nanoid()}`;

		await insertTestWorkflow(context, workflowId, testWorkflowName);

		// Insert statistics with values exceeding INTEGER max (2147483647)
		const tableName = context.escape.tableName('workflow_statistics');
		const workflowIdColumn = context.escape.columnName('workflowId');
		const nameColumn = context.escape.columnName('name');
		const countColumn = context.escape.columnName('count');
		const rootCountColumn = context.escape.columnName('rootCount');
		const latestEventColumn = context.escape.columnName('latestEvent');
		const workflowNameColumn = context.escape.columnName('workflowName');

		const overflowValue = '3000000000'; // Exceeds INTEGER max
		const placeholders = getParamPlaceholders(context, 6);
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${workflowIdColumn}, ${nameColumn}, ${countColumn}, ${rootCountColumn}, ${latestEventColumn}, ${workflowNameColumn}) VALUES (${placeholders})`,
			[workflowId, uniqueStatName, overflowValue, overflowValue, new Date(), testWorkflowName],
		);

		// Verify the large values were inserted
		const placeholder = getParamPlaceholder(context);
		const beforeRollback = await context.queryRunner.query(
			`SELECT ${countColumn} as "count", ${rootCountColumn} as "rootCount" FROM ${tableName} WHERE ${nameColumn} = ${placeholder}`,
			[uniqueStatName],
		);
		expect(beforeRollback).toHaveLength(1);
		expect(Number(beforeRollback[0].count)).toBeGreaterThan(2147483647);
		expect(Number(beforeRollback[0].rootCount)).toBeGreaterThan(2147483647);

		await context.queryRunner.release();

		// Rollback the migration - should reset overflowing values to 0 on PostgreSQL
		await undoLastSingleMigration();

		// Create new context after rollback
		dataSource = Container.get(DataSource);
		context = createTestMigrationContext(dataSource);

		// Verify values were reset to 0 on PostgreSQL (preventing overflow errors)
		const afterRollback = await context.queryRunner.query(
			`SELECT ${countColumn} as "count", ${rootCountColumn} as "rootCount" FROM ${tableName} WHERE ${nameColumn} = ${placeholder}`,
			[uniqueStatName],
		);
		expect(afterRollback).toHaveLength(1);
		expect(afterRollback[0].count).toBe(0);
		expect(afterRollback[0].rootCount).toBe(0);

		// Cleanup
		await context.queryRunner.query(
			`DELETE FROM ${tableName} WHERE ${nameColumn} = ${placeholder}`,
			[uniqueStatName],
		);
		await deleteWorkflow(context, workflowId);

		await context.queryRunner.release();
	});
});
