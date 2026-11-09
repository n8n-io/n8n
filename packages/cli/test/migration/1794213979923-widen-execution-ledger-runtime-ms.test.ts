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

const MIGRATION_NAME = 'WidenExecutionLedgerRuntimeMs1794213979923';
const CREATE_MIGRATION_NAME = 'CreateExecutionLedgerTable1793280161358';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';

// About 34.7 days in milliseconds: above the int range.
const longRuntimeMs = 3_000_000_000;
const intMax = 2_147_483_647;

describe('WidenExecutionLedgerRuntimeMs migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => await context.queryRunner.clearDatabase());
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

	async function insertEndedRow(context: TestMigrationContext, runtimeMs: number) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('execution_ledger')}
			   ("executionId", "occurredAt", "entityType", "entityName", "entityId", "projectId",
			    "mode", "event", "outcome", "runtimeMs", "origin", "eventId")
			 VALUES ('1', :occurredAt, 'workflow', 'wf', 'wf-1', 'project-1',
			    'trigger', 'ended', 'success', :runtimeMs, 'v1', :eventId)`,
			{ occurredAt: '2026-10-28 10:00:00.000', runtimeMs, eventId: uuidv7() },
		);
	}

	async function readRuntimeMs(context: TestMigrationContext): Promise<number> {
		const [row] = await context.runQuery<Array<{ runtimeMs: string | number }>>(
			`SELECT "runtimeMs" FROM ${context.escape.tableName('execution_ledger')}`,
		);
		return Number(row.runtimeMs);
	}

	async function runtimeMsType(context: TestMigrationContext): Promise<string> {
		const [{ type }] = await context.runQuery<Array<{ type: string }>>(
			`SELECT data_type AS "type" FROM information_schema.columns
			 WHERE table_schema = current_schema() AND table_name = :table AND column_name = 'runtimeMs'`,
			{ table: `${context.tablePrefix}execution_ledger` },
		);
		return type;
	}

	// SQLite has no such migration: its INTEGER column already holds 64-bit values.
	it.skipIf(!isSqlite)('stores a runtime above the int range on SQLite', async () => {
		await initDbUpToMigration(CREATE_MIGRATION_NAME);
		await runSingleMigration(CREATE_MIGRATION_NAME);

		await withContext(async (context) => {
			await insertEndedRow(context, longRuntimeMs);
			expect(await readRuntimeMs(context)).toBe(longRuntimeMs);
		});
	});

	describe.skipIf(isSqlite)('on Postgres', () => {
		beforeEach(async () => {
			await initDbUpToMigration(MIGRATION_NAME);
		});

		it('rejects a runtime above the int range before the migration', async () => {
			await withContext(async (context) => {
				await expect(insertEndedRow(context, longRuntimeMs)).rejects.toThrow(/out of range/);
			});
		});

		it('widens runtimeMs to bigint and keeps existing rows', async () => {
			await withContext(async (context) => await insertEndedRow(context, 1200));

			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				expect(await runtimeMsType(context)).toBe('bigint');
				expect(await readRuntimeMs(context)).toBe(1200);
				await context.runQuery(`DELETE FROM ${context.escape.tableName('execution_ledger')}`);
				await insertEndedRow(context, longRuntimeMs);
				expect(await readRuntimeMs(context)).toBe(longRuntimeMs);
			});
		});

		it('narrows back on down, clamps longer runtimes, and runs up again', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await withContext(async (context) => await insertEndedRow(context, longRuntimeMs));

			await undoLastSingleMigration();

			await withContext(async (context) => {
				expect(await runtimeMsType(context)).toBe('integer');
				expect(await readRuntimeMs(context)).toBe(intMax);
			});

			await runSingleMigration(MIGRATION_NAME);
			await withContext(async (context) => {
				expect(await runtimeMsType(context)).toBe('bigint');
			});
		});
	});
});
