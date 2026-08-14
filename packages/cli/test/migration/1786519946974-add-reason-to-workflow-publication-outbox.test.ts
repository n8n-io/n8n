import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'AddReasonToWorkflowPublicationOutbox1786519946974';

describe('AddReasonToWorkflowPublicationOutbox Migration', () => {
	let dataSource: DataSource;

	async function insertRecord(
		context: TestMigrationContext,
		workflowId: string,
		reason?: string,
	): Promise<void> {
		const table = context.escape.tableName('workflow_publication_outbox');
		if (reason === undefined) {
			await context.runQuery(
				`INSERT INTO ${table} ("workflowId", "publishedVersionId", "status")
				 VALUES (:workflowId, :versionId, :status)`,
				{ workflowId, versionId: 'v-1', status: 'pending' },
			);
			return;
		}
		await context.runQuery(
			`INSERT INTO ${table} ("workflowId", "publishedVersionId", "status", "reason")
			 VALUES (:workflowId, :versionId, :status, :reason)`,
			{ workflowId, versionId: 'v-1', status: 'pending', reason },
		);
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	// Each test starts from a clean database migrated up to (but not including)
	// this migration and owns its fixtures, so the tests run in any order or
	// in isolation.
	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('adds the reason column with a publish default and enforces the enum check', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const context = createTestMigrationContext(dataSource);
		try {
			// A pre-upgrade writer that doesn't know the column gets the default.
			await insertRecord(context, 'wf-default');
			const rows = await context.runQuery<Array<{ reason: string }>>(
				`SELECT ${context.escape.columnName('reason')} FROM ${context.escape.tableName('workflow_publication_outbox')}
				 WHERE ${context.escape.columnName('workflowId')} = 'wf-default'`,
			);
			expect(rows[0].reason).toBe('publish');

			await expect(insertRecord(context, 'wf-startup', 'startup')).resolves.not.toThrow();
			await expect(insertRecord(context, 'wf-bogus', 'not-a-reason')).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('rolls back cleanly, preserving rows, and can be reapplied', async () => {
		await runSingleMigration(MIGRATION_NAME);

		let context = createTestMigrationContext(dataSource);
		try {
			await insertRecord(context, 'wf-defaulted');
			await insertRecord(context, 'wf-stamped', 'startup');
		} finally {
			await context.queryRunner.release();
		}

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		try {
			const rows = await context.runQuery<Array<{ workflowId: string }>>(
				`SELECT ${context.escape.columnName('workflowId')} FROM ${context.escape.tableName('workflow_publication_outbox')}`,
			);
			expect(rows.map(({ workflowId }) => workflowId).sort()).toEqual([
				'wf-defaulted',
				'wf-stamped',
			]);
		} finally {
			await context.queryRunner.release();
		}

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		try {
			await expect(insertRecord(context, 'wf-after-redo', 'reconcile')).resolves.not.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});
});
