import { Logger } from '@n8n/backend-common';
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
import { v7 as uuidv7 } from 'uuid';

const MIGRATION_NAME = 'MakeExecutionLedgerProjectIdNullable1795297187883';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';

type RowOverrides = { executionId?: string; projectId?: string | null; event?: string };

describe('MakeExecutionLedgerProjectIdNullable migration', () => {
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

	async function insertRow(
		context: TestMigrationContext,
		{ executionId = '1', projectId = 'project-1', event = 'started' }: RowOverrides = {},
	) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('execution_ledger')}
			   ("executionId", "occurredAt", "entityType", "entityName", "entityId", "projectId",
			    "mode", "event", "outcome", "origin", "eventId")
			 VALUES (:executionId, :occurredAt, 'workflow', 'wf', 'wf-1', :projectId,
			    'trigger', :event, 'none', 'v1', :eventId)`,
			{ executionId, occurredAt: '2026-10-28 10:00:00.000', projectId, event, eventId: uuidv7() },
		);
	}

	async function readRows(context: TestMigrationContext) {
		return await context.runQuery<Array<{ executionId: string; projectId: string | null }>>(
			`SELECT "executionId", "projectId" FROM ${context.escape.tableName('execution_ledger')} ORDER BY "id"`,
		);
	}

	async function readComment(context: TestMigrationContext): Promise<string> {
		const [{ comment }] = await context.runQuery<Array<{ comment: string }>>(
			`SELECT col_description(c.table_name::regclass, c.ordinal_position) AS "comment"
			 FROM information_schema.columns c
			 WHERE c.table_schema = current_schema() AND c.table_name = :table AND c.column_name = 'projectId'`,
			{ table: `${context.tablePrefix}execution_ledger` },
		);
		return comment;
	}

	it('rejects a row with no project before the migration', async () => {
		await withContext(async (context) => {
			await expect(insertRow(context, { projectId: null })).rejects.toThrow(/null/i);
		});
	});

	it('accepts a row with no project and keeps existing rows', async () => {
		await withContext(async (context) => await insertRow(context));

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			await insertRow(context, { executionId: '2', projectId: null });
			expect(await readRows(context)).toEqual([
				{ executionId: '1', projectId: 'project-1' },
				{ executionId: '2', projectId: null },
			]);
		});
	});

	it('keeps the check constraints', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			// An ended row must have an outcome other than none.
			await expect(insertRow(context, { event: 'ended' })).rejects.toThrow();
			await expect(insertRow(context, { event: 'paused' })).rejects.toThrow();
		});
	});

	it('down deletes the rows with no project, warns, and restores NOT NULL', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await withContext(async (context) => {
			await insertRow(context);
			await insertRow(context, { executionId: '2', projectId: null });
			await insertRow(context, { executionId: '3', projectId: null });
		});
		const warn = vi.spyOn(Container.get(Logger), 'warn');

		await undoLastSingleMigration();

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Deleting 2 ledger rows that have no project'),
		);
		warn.mockRestore();
		await withContext(async (context) => {
			expect(await readRows(context)).toEqual([{ executionId: '1', projectId: 'project-1' }]);
			await expect(insertRow(context, { projectId: null })).rejects.toThrow(/null/i);
		});
	});

	it('down does not warn when every row has a project, and up runs again', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await withContext(async (context) => await insertRow(context));
		const warn = vi.spyOn(Container.get(Logger), 'warn');

		await undoLastSingleMigration();

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('ledger rows'));
		warn.mockRestore();

		await runSingleMigration(MIGRATION_NAME);
		await withContext(async (context) => {
			await insertRow(context, { executionId: '2', projectId: null });
			expect(await readRows(context)).toHaveLength(2);
		});
	});

	it.skipIf(isSqlite)('updates the column comment on Postgres', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await withContext(async (context) => {
			expect(await readComment(context)).toContain('Null when the workflow has no owner project');
		});

		await undoLastSingleMigration();
		await withContext(async (context) => {
			expect(await readComment(context)).not.toContain('Null when');
		});
	});
});
