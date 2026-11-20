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

const MIGRATION_NAME = 'CreateExecutionLedgerParkedTable1795203017443';

const parkedRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	ledgerId: 1,
	step: 'usage',
	error: 'upsert failed',
	parkedAt: '2026-11-19 10:00:05.000',
	executionId: '1',
	occurredAt: '2026-11-19 10:00:00.000',
	entityType: 'workflow',
	entityName: 'My workflow',
	entityId: 'wf-1',
	projectId: 'project-1',
	mode: 'trigger',
	source: 'none',
	event: 'ended',
	outcome: 'success',
	blockedBy: 'none',
	runtimeMs: 1200,
	timeSavedMin: 5,
	origin: 'v1',
	eventId: uuidv7(),
	...overrides,
});

describe('CreateExecutionLedgerParkedTable Migration', () => {
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
		await context.runQuery(`DELETE FROM ${parked()}`).catch(() => {});
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	const parked = () => context.escape.tableName('execution_ledger_parked');
	const column = (name: string) => context.escape.columnName(name);

	async function insertRow(row: Record<string, unknown>) {
		const keys = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${parked()} (${keys.map(column).join(', ')}) VALUES (${keys.map((key) => `:${key}`).join(', ')})`,
			row,
		);
	}

	async function selectRows() {
		return await context.runQuery<
			Array<{ ledgerId: number | string; step: string; outcome: string; runtimeMs: number }>
		>(
			`SELECT ${column('ledgerId')} AS "ledgerId", step, outcome, ${column('runtimeMs')} AS "runtimeMs" FROM ${parked()} ORDER BY id`,
		);
	}

	it('stores a parked row', async () => {
		await insertRow(parkedRow());

		const [row] = await selectRows();
		expect(row).toMatchObject({ step: 'usage', outcome: 'success' });
		expect(Number(row.ledgerId)).toBe(1);
	});

	it('accepts values that the ledger table rejects', async () => {
		await insertRow(
			parkedRow({
				step: '_unreadable',
				entityType: 'credential',
				event: 'finished',
				outcome: 'waiting',
				blockedBy: 'executionLimit',
				origin: 'v3',
			}),
		);

		expect(await selectRows()).toHaveLength(1);
	});

	it('accepts a row with no project', async () => {
		await insertRow(parkedRow({ projectId: null }));

		expect(await selectRows()).toHaveLength(1);
	});

	it('stores a runtime above the 32-bit range', async () => {
		await insertRow(parkedRow({ runtimeMs: 3_000_000_000 }));

		const [row] = await selectRows();
		expect(Number(row.runtimeMs)).toBe(3_000_000_000);
	});

	it('rejects the same ledger row twice for one step', async () => {
		await insertRow(parkedRow());

		await expect(insertRow(parkedRow())).rejects.toThrow();
	});

	it('accepts the same ledger row for two steps', async () => {
		await insertRow(parkedRow({ step: 'usage' }));
		await insertRow(parkedRow({ step: 'insights' }));

		expect(await selectRows()).toHaveLength(2);
	});

	it.each(['ledgerId', 'step', 'error', 'parkedAt', 'outcome', 'source', 'blockedBy', 'runtimeMs'])(
		'rejects a row without %s',
		async (key) => {
			await expect(insertRow(parkedRow({ [key]: null }))).rejects.toThrow();
		},
	);

	// Runs last: it reverts the migration.
	it('down warns with the number of rows that it drops', async () => {
		await insertRow(parkedRow({ ledgerId: 1 }));
		await insertRow(parkedRow({ ledgerId: 2 }));
		await context.queryRunner.release();
		const warn = vi.spyOn(Container.get(Logger), 'warn');

		await undoLastSingleMigration();

		expect(warn).toHaveBeenCalledWith(
			`[${MIGRATION_NAME}] Dropping 2 parked ledger rows that no replay has read`,
		);
		warn.mockRestore();
		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
	});

	it('down does not warn when the table is empty', async () => {
		await context.queryRunner.release();
		const warn = vi.spyOn(Container.get(Logger), 'warn');

		await undoLastSingleMigration();

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('parked ledger rows'));
		warn.mockRestore();
		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
	});

	it('down drops the table, and up runs again after it', async () => {
		await context.queryRunner.release();

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		await expect(context.runQuery(`SELECT 1 FROM ${parked()}`)).rejects.toThrow();
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		await insertRow(parkedRow());
		expect(await selectRows()).toHaveLength(1);
	});
});
