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

const MIGRATION_NAME = 'CreateExecutionLimitUsageTable1795078684396';

type UsageRow = {
	projectId: string;
	day: string;
	entityType: string;
	startedCount?: number;
	blockedCount?: number;
	updatedAt: string | null;
};

const usageRow = (overrides: Partial<UsageRow> = {}): UsageRow => ({
	projectId: 'project-1',
	day: '2026-11-19',
	entityType: 'workflow',
	updatedAt: '2026-11-19 10:00:00.000',
	...overrides,
});

describe('CreateExecutionLimitUsageTable Migration', () => {
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
		await context.runQuery(`DELETE FROM ${usage()}`).catch(() => {});
		await context.runQuery(`DELETE FROM ${instanceUsage()}`).catch(() => {});
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	const usage = () => context.escape.tableName('execution_limit_usage');
	const instanceUsage = () => context.escape.tableName('execution_limit_instance_usage');
	const column = (name: string) => context.escape.columnName(name);
	const checkFailure = (check: string) => new RegExp(`CHK_\\w*execution_limit_usage_${check}`);
	const instanceCheckFailure = (check: string) =>
		new RegExp(`CHK_\\w*execution_limit_instance_usage_${check}`);

	const insertSql = (row: Record<string, unknown>, table = usage()) => {
		const keys = Object.keys(row);
		return `INSERT INTO ${table} AS u (${keys.map(column).join(', ')}) VALUES (${keys.map((key) => `:${key}`).join(', ')})`;
	};

	async function insertRow(row: Record<string, unknown>) {
		await context.runQuery(insertSql(row), row);
	}

	async function insertInstanceRow(row: Record<string, unknown>) {
		await context.runQuery(insertSql(row, instanceUsage()), row);
	}

	// The shape of the statement that the fold step runs.
	async function addCounts(row: Record<string, unknown>, table: string, key: string[]) {
		const add = (name: string) => `${column(name)} = u.${column(name)} + excluded.${column(name)}`;
		await context.runQuery(
			`${insertSql(row, table)} ON CONFLICT (${key.map(column).join(', ')}) DO UPDATE SET ${add('startedCount')}, ${add('blockedCount')}, ${column('updatedAt')} = excluded.${column('updatedAt')}`,
			row,
		);
	}

	const instanceRow = (overrides: Record<string, unknown> = {}) => {
		const { projectId: _, ...row } = usageRow();
		return { ...row, ...overrides };
	};

	async function selectInstanceRows() {
		const rows = await context.runQuery<
			Array<{ day: string; entityType: string; startedCount: number; blockedCount: number }>
		>(
			`SELECT CAST(${column('day')} AS TEXT) AS "day", ${column('entityType')} AS "entityType", ${column('startedCount')} AS "startedCount", ${column('blockedCount')} AS "blockedCount" FROM ${instanceUsage()} ORDER BY ${column('day')}, ${column('entityType')}`,
		);
		return rows.map((row) => ({
			...row,
			startedCount: Number(row.startedCount),
			blockedCount: Number(row.blockedCount),
		}));
	}

	async function selectRows() {
		const rows = await context.runQuery<
			Array<{
				projectId: string;
				day: string;
				entityType: string;
				startedCount: number;
				blockedCount: number;
			}>
		>(
			`SELECT ${column('projectId')} AS "projectId", CAST(${column('day')} AS TEXT) AS "day", ${column('entityType')} AS "entityType", ${column('startedCount')} AS "startedCount", ${column('blockedCount')} AS "blockedCount" FROM ${usage()} ORDER BY ${column('projectId')}, ${column('day')}, ${column('entityType')}`,
		);
		return rows.map((row) => ({
			...row,
			startedCount: Number(row.startedCount),
			blockedCount: Number(row.blockedCount),
		}));
	}

	it('stores one row for each project, day and entity type', async () => {
		await insertRow(usageRow());
		await insertRow(usageRow({ entityType: 'agent' }));
		await insertRow(usageRow({ day: '2026-11-20' }));
		await insertRow(usageRow({ projectId: 'project-2' }));

		expect(await selectRows()).toHaveLength(4);
	});

	it('rejects a second row with the same project, day and entity type', async () => {
		await insertRow(usageRow());

		await expect(insertRow(usageRow())).rejects.toThrow();
	});

	it('stores the day as a date and defaults both counts to 0', async () => {
		await insertRow(usageRow());

		expect(await selectRows()).toEqual([
			{
				projectId: 'project-1',
				day: '2026-11-19',
				entityType: 'workflow',
				startedCount: 0,
				blockedCount: 0,
			},
		]);
	});

	it('accepts a row that matches no project', async () => {
		await insertRow(usageRow({ projectId: 'deleted-project' }));

		expect(await selectRows()).toHaveLength(1);
	});

	it('rejects an unknown entity type', async () => {
		await expect(insertRow(usageRow({ entityType: 'credential' }))).rejects.toThrow(
			checkFailure('entityType'),
		);
	});

	it.each(['startedCount', 'blockedCount'])('rejects a negative %s', async (key) => {
		await expect(insertRow({ ...usageRow(), [key]: -1 })).rejects.toThrow(
			checkFailure('counts_non_negative'),
		);
	});

	it('accepts more blocked runs than started runs', async () => {
		await insertRow(usageRow({ startedCount: 0, blockedCount: 3 }));

		expect(await selectRows()).toHaveLength(1);
	});

	it('rejects a null updatedAt and defaults it to the current time', async () => {
		await expect(insertRow(usageRow({ updatedAt: null }))).rejects.toThrow();

		const { updatedAt: _, ...row } = usageRow();
		await insertRow(row);

		const [{ count }] = await context.runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS "count" FROM ${usage()} WHERE ${column('updatedAt')} IS NOT NULL`,
		);
		expect(Number(count)).toBe(1);
	});

	it('has an index on day alone', async () => {
		const table = `${context.tablePrefix}execution_limit_usage`;
		const rows = context.isSqlite
			? await context.runQuery<Array<{ definition: string }>>(
					"SELECT sql AS definition FROM sqlite_master WHERE type = 'index' AND tbl_name = :table AND sql IS NOT NULL",
					{ table },
				)
			: await context.runQuery<Array<{ definition: string }>>(
					'SELECT indexdef AS definition FROM pg_indexes WHERE tablename = :table',
					{ table },
				);

		expect(rows.some((row) => /\(\s*"?day"?\s*\)/.test(row.definition))).toBe(true);
	});

	it('adds to the counts of an existing row on conflict', async () => {
		const counts = { startedCount: 5, blockedCount: 1 };
		const key = ['projectId', 'day', 'entityType'];
		await addCounts({ ...usageRow(), ...counts }, usage(), key);
		await addCounts(
			{ ...usageRow(), ...counts, updatedAt: '2026-11-19 10:00:05.000' },
			usage(),
			key,
		);

		expect(await selectRows()).toEqual([
			expect.objectContaining({ startedCount: 10, blockedCount: 2 }),
		]);
	});

	it('sums the days of a period for one project', async () => {
		await insertRow(usageRow({ day: '2026-10-31', startedCount: 100 }));
		await insertRow(usageRow({ day: '2026-11-01', startedCount: 3 }));
		await insertRow(usageRow({ day: '2026-11-30', startedCount: 4, entityType: 'agent' }));
		await insertRow(usageRow({ day: '2026-12-01', startedCount: 100 }));
		await insertRow(usageRow({ day: '2026-11-15', startedCount: 100, projectId: 'project-2' }));

		const [{ total }] = await context.runQuery<Array<{ total: string | number }>>(
			`SELECT SUM(${column('startedCount')}) AS "total" FROM ${usage()} WHERE ${column('projectId')} = :projectId AND ${column('day')} BETWEEN :from AND :to`,
			{ projectId: 'project-1', from: '2026-11-01', to: '2026-11-30' },
		);

		expect(Number(total)).toBe(7);
	});

	describe('instance table', () => {
		it('stores one row for each day and entity type', async () => {
			await insertInstanceRow(instanceRow());
			await insertInstanceRow(instanceRow({ entityType: 'agent' }));
			await insertInstanceRow(instanceRow({ day: '2026-11-20' }));

			expect(await selectInstanceRows()).toHaveLength(3);
		});

		it('rejects a second row with the same day and entity type', async () => {
			await insertInstanceRow(instanceRow());

			await expect(insertInstanceRow(instanceRow())).rejects.toThrow();
		});

		it('stores the day as a date and defaults both counts to 0', async () => {
			await insertInstanceRow(instanceRow());

			expect(await selectInstanceRows()).toEqual([
				{ day: '2026-11-19', entityType: 'workflow', startedCount: 0, blockedCount: 0 },
			]);
		});

		it('rejects an unknown entity type', async () => {
			await expect(insertInstanceRow(instanceRow({ entityType: 'credential' }))).rejects.toThrow(
				instanceCheckFailure('entityType'),
			);
		});

		it.each(['startedCount', 'blockedCount'])('rejects a negative %s', async (key) => {
			await expect(insertInstanceRow(instanceRow({ [key]: -1 }))).rejects.toThrow(
				instanceCheckFailure('counts_non_negative'),
			);
		});

		it('rejects a null updatedAt and defaults it to the current time', async () => {
			await expect(insertInstanceRow(instanceRow({ updatedAt: null }))).rejects.toThrow();

			const { updatedAt: _, ...row } = instanceRow();
			await insertInstanceRow(row);

			const [{ count }] = await context.runQuery<Array<{ count: string | number }>>(
				`SELECT COUNT(*) AS "count" FROM ${instanceUsage()} WHERE ${column('updatedAt')} IS NOT NULL`,
			);
			expect(Number(count)).toBe(1);
		});

		it('adds to the counts of an existing row on conflict', async () => {
			const row = instanceRow({ startedCount: 5, blockedCount: 1 });
			await addCounts(row, instanceUsage(), ['day', 'entityType']);
			await addCounts(row, instanceUsage(), ['day', 'entityType']);

			expect(await selectInstanceRows()).toEqual([
				expect.objectContaining({ startedCount: 10, blockedCount: 2 }),
			]);
		});

		it('is not part of a sum of the project rows', async () => {
			await insertRow(usageRow({ startedCount: 4 }));
			await insertInstanceRow(instanceRow({ startedCount: 4 }));

			const [{ total }] = await context.runQuery<Array<{ total: string | number }>>(
				`SELECT SUM(${column('startedCount')}) AS "total" FROM ${usage()}`,
			);

			expect(Number(total)).toBe(4);
		});
	});

	it.each([['execution_limit_usage'], ['execution_limit_instance_usage']])(
		'sets the storage options of %s on Postgres',
		async (table) => {
			if (!context.isPostgres) return;

			const [{ reloptions }] = await context.runQuery<Array<{ reloptions: string[] }>>(
				`SELECT reloptions FROM pg_class WHERE oid = to_regclass('${context.escape.tableName(table)}')`,
			);

			expect(reloptions).toEqual(
				expect.arrayContaining([
					'fillfactor=90',
					'autovacuum_vacuum_scale_factor=0.0',
					'autovacuum_vacuum_threshold=1000',
				]),
			);
		},
	);

	// Runs last: it reverts the migration.
	it('down warns with the number of rows that it drops', async () => {
		await insertRow(usageRow());
		await insertRow(usageRow({ entityType: 'agent' }));
		await insertInstanceRow(instanceRow());
		await context.queryRunner.release();
		const warn = vi.spyOn(Container.get(Logger), 'warn');

		await undoLastSingleMigration();

		expect(warn).toHaveBeenCalledWith(
			`[${MIGRATION_NAME}] Dropping 2 rows of execution_limit_usage`,
		);
		expect(warn).toHaveBeenCalledWith(
			`[${MIGRATION_NAME}] Dropping 1 rows of execution_limit_instance_usage`,
		);
		warn.mockRestore();
		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
	});

	it('down does not warn when the table is empty', async () => {
		await context.queryRunner.release();
		const warn = vi.spyOn(Container.get(Logger), 'warn');

		await undoLastSingleMigration();

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Dropping'));
		warn.mockRestore();
		await runSingleMigration(MIGRATION_NAME);
		context = createTestMigrationContext(dataSource);
	});

	it('down drops the table, and up runs again after it', async () => {
		await context.queryRunner.release();

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		await expect(context.runQuery(`SELECT 1 FROM ${usage()}`)).rejects.toThrow();
		await expect(context.runQuery(`SELECT 1 FROM ${instanceUsage()}`)).rejects.toThrow();
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		await insertRow(usageRow());
		await insertInstanceRow(instanceRow());
		expect(await selectRows()).toHaveLength(1);
		expect(await selectInstanceRows()).toHaveLength(1);
	});
});
