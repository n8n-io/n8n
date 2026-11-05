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

const MIGRATION_NAME = 'CreateExecutionLedgerTable1793280161358';

type LedgerRow = {
	executionId: string;
	occurredAt: string;
	entityType: string;
	entityName: string;
	entityId: string;
	projectId: string;
	mode: string;
	source?: string;
	event: string;
	outcome: string;
	blockedBy?: string;
	runtimeMs?: number;
	timeSavedMin?: number;
	origin: string;
	eventId: string;
};

const startedRow = (): LedgerRow => ({
	executionId: '1',
	occurredAt: '2026-10-28 10:00:00.000',
	entityType: 'workflow',
	entityName: 'My workflow',
	entityId: 'wf-1',
	projectId: 'project-1',
	mode: 'trigger',
	event: 'started',
	outcome: 'none',
	origin: 'v1',
	eventId: uuidv7(),
});

const endedRow = (overrides: Partial<LedgerRow> = {}): LedgerRow => ({
	...startedRow(),
	event: 'ended',
	outcome: 'success',
	runtimeMs: 1200,
	timeSavedMin: 5,
	...overrides,
});

describe('CreateExecutionLedgerTable Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	beforeEach(() => {
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		await context.runQuery(`DELETE FROM ${ledger()}`).catch(() => {});
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	const ledger = () => context.escape.tableName('execution_ledger');
	const checkFailure = (check: string) => new RegExp(`CHK_\\w*execution_ledger_${check}`);
	const column = (name: string) => context.escape.columnName(name);

	async function insertRow(row: Record<string, unknown>) {
		const keys = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${ledger()} (${keys.map(column).join(', ')}) VALUES (${keys.map((key) => `:${key}`).join(', ')})`,
			row,
		);
	}

	async function selectRows() {
		return await context.runQuery<
			Array<{ id: number | string; source: string; blockedBy: string; runtimeMs: number }>
		>(
			`SELECT id, source, ${column('blockedBy')} AS "blockedBy", ${column('runtimeMs')} AS "runtimeMs" FROM ${ledger()} ORDER BY id`,
		);
	}

	it('stores a started row and an ended row in insert order', async () => {
		await insertRow(startedRow());
		await insertRow(endedRow());

		const rows = await selectRows();
		expect(rows).toHaveLength(2);
		expect(Number(rows[1].id)).toBeGreaterThan(Number(rows[0].id));
	});

	it('defaults source and blockedBy to none and runtime to 0', async () => {
		await insertRow(startedRow());

		const [row] = await selectRows();
		expect(row).toMatchObject({ source: 'none', blockedBy: 'none' });
		expect(Number(row.runtimeMs)).toBe(0);
	});

	it.each([
		['entityType', 'credential', {}],
		['event', 'finished', {}],
		['outcome', 'waiting', {}],
		['blockedBy', 'executionLimit', { outcome: 'blocked' }],
		['origin', 'v3', {}],
	])('rejects %s = %s', async (key, value, base: Partial<LedgerRow>) => {
		const row: Record<string, unknown> = { ...endedRow(base), [key]: value };

		// An unknown event also breaks the started/outcome check; either may report first.
		const check = key === 'event' ? '(event|started_outcome)' : key;
		await expect(insertRow(row)).rejects.toThrow(checkFailure(check));
	});

	it.each([
		'executionId',
		'occurredAt',
		'entityType',
		'entityName',
		'entityId',
		'projectId',
		'mode',
		'event',
		'outcome',
		'origin',
		'eventId',
	])('rejects a row without %s', async (key) => {
		const row: Record<string, unknown> = startedRow();
		row[key] = null;

		await expect(insertRow(row)).rejects.toThrow();
	});

	it('accepts any mode and source', async () => {
		await insertRow({ ...startedRow(), mode: 'future-mode', source: 'future-source' });

		expect(await selectRows()).toHaveLength(1);
	});

	it.each([
		['started', 'success', 'none', 'started_outcome'],
		['ended', 'none', 'none', 'started_outcome'],
		['ended', 'blocked', 'none', 'blocked_reason'],
		['ended', 'success', 'policy', 'blocked_reason'],
	])(
		'rejects event = %s with outcome = %s and blockedBy = %s',
		async (event, outcome, blockedBy, check) => {
			const row = endedRow({ event, outcome, blockedBy });
			await expect(insertRow(row)).rejects.toThrow(checkFailure(check));
		},
	);

	it.each(['policy', 'credentialAccess', 'invalidWorkflow', 'contextHook', 'startFailed'])(
		'accepts a blocked row with blockedBy = %s',
		async (blockedBy) => {
			await insertRow(endedRow({ outcome: 'blocked', blockedBy, runtimeMs: 0 }));

			expect(await selectRows()).toHaveLength(1);
		},
	);

	it('does not reuse IDs after the rows are deleted', async () => {
		await insertRow(startedRow());
		const [first] = await selectRows();
		await context.runQuery(`DELETE FROM ${ledger()}`);

		await insertRow(startedRow());

		const [second] = await selectRows();
		expect(Number(second.id)).toBeGreaterThan(Number(first.id));
	});

	it('tunes autovacuum on Postgres', async () => {
		if (!context.isPostgres) return;

		const [{ reloptions }] = await context.runQuery<Array<{ reloptions: string[] }>>(
			`SELECT reloptions FROM pg_class WHERE oid = to_regclass('${ledger()}')`,
		);

		expect(reloptions).toEqual(
			expect.arrayContaining([
				'autovacuum_vacuum_scale_factor=0.0',
				'autovacuum_vacuum_threshold=1000',
				'autovacuum_vacuum_cost_delay=0',
			]),
		);
	});

	// Runs last: it reverts the migration.
	it('down drops the table, and up runs again after it', async () => {
		await context.queryRunner.release();

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		await expect(context.runQuery(`SELECT 1 FROM ${ledger()}`)).rejects.toThrow();
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		await insertRow(startedRow());
		expect(await selectRows()).toHaveLength(1);
	});
});
