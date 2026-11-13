import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'AddTransferReasonToWorkflowPublicationOutbox1794495522674';

describe('AddTransferReasonToWorkflowPublicationOutbox Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertRecord(reason: string): Promise<void> {
		const context = createTestMigrationContext(dataSource);
		try {
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('workflow_publication_outbox')}
				   ("workflowId", "publishedVersionId", "status", "reason", "createdAt", "updatedAt")
				 VALUES ('workflow-1', 'version-1', 'pending', '${reason}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function reasons(): Promise<string[]> {
		const context = createTestMigrationContext(dataSource);
		const rows = (await context.queryRunner.query(
			`SELECT "reason" FROM ${context.escape.tableName('workflow_publication_outbox')}`,
		)) as Array<{ reason: string }>;
		await context.queryRunner.release();
		return rows.map((row) => row.reason);
	}

	test('refuses the transfer reason before the migration', async () => {
		await expect(insertRecord('transfer')).rejects.toThrow();
	});

	test('accepts the transfer reason after the migration', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await insertRecord('transfer');

		expect(await reasons()).toEqual(['transfer']);
	});

	test('rewrites transfer records to publish when reverted', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await insertRecord('transfer');

		await undoLastSingleMigration();

		expect(await reasons()).toEqual(['publish']);
	});
});
