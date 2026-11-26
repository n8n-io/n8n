import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

const MIGRATION_NAME = 'ClearExecutionLedgerBacklog1795623388225';

describe('ClearExecutionLedgerBacklog migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertRow(context: TestMigrationContext, executionId: string, event: string) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('execution_ledger')}
			   ("executionId", "occurredAt", "entityType", "entityName", "entityId", "projectId",
			    "mode", "event", "outcome", "origin", "eventId")
			 VALUES (:executionId, :occurredAt, 'workflow', 'wf', 'wf-1', 'project-1',
			    'trigger', :event, :outcome, 'v1', :eventId)`,
			{
				executionId,
				occurredAt: '2026-11-20 10:00:00.000',
				event,
				outcome: event === 'started' ? 'none' : 'success',
				eventId: uuidv7(),
			},
		);
	}

	async function countRows(context: TestMigrationContext) {
		const [{ total }] = await context.runQuery<Array<{ total: number | string }>>(
			`SELECT COUNT(*) AS total FROM ${context.escape.tableName('execution_ledger')}`,
		);
		return Number(total);
	}

	it('deletes every ledger row', async () => {
		await withContext(async (context) => {
			await insertRow(context, '1', 'started');
			await insertRow(context, '1', 'ended');
			await insertRow(context, '2', 'started');
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => expect(await countRows(context)).toBe(0));
	});

	it('runs on an empty ledger', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => expect(await countRows(context)).toBe(0));
	});

	it('accepts new rows after it ran', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			await insertRow(context, '3', 'started');
			expect(await countRows(context)).toBe(1);
		});
	});
});
