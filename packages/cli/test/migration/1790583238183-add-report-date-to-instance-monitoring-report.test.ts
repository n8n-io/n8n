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
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddReportDateToInstanceMonitoringReport1790262708467';
const TABLE = 'instance_monitoring_report';

type Status = 'pending' | 'delivered' | 'skipped_after_max_retries';

describe('AddReportDateToInstanceMonitoringReport Migration', () => {
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
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertReport(
		context: TestMigrationContext,
		{ createdAt, status = 'delivered' }: { createdAt: string; status?: Status },
	): Promise<string> {
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(TABLE)}
			   ("id", "dataPoints", "status", "createdAt", "updatedAt")
			 VALUES (:id, '[]', :status, :createdAt, :createdAt)`,
			{ id, status, createdAt },
		);
		return id;
	}

	async function insertReportOn(context: TestMigrationContext, reportDate: string) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(TABLE)}
			   ("id", "dataPoints", "reportDate", "createdAt", "updatedAt")
			 VALUES (:id, '[]', :reportDate, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id: randomUUID(), reportDate },
		);
	}

	async function reportDates(
		context: TestMigrationContext,
	): Promise<Record<string, string | null>> {
		const rows = (await context.queryRunner.query(
			`SELECT "id", "reportDate" FROM ${context.escape.tableName(TABLE)}`,
		)) as Array<{ id: string; reportDate: string | null }>;
		return Object.fromEntries(rows.map((row) => [row.id, row.reportDate]));
	}

	async function statuses(context: TestMigrationContext): Promise<Record<string, Status>> {
		const rows = (await context.queryRunner.query(
			`SELECT "id", "status" FROM ${context.escape.tableName(TABLE)}`,
		)) as Array<{ id: string; status: Status }>;
		return Object.fromEntries(rows.map((row) => [row.id, row.status]));
	}

	async function columnNames(context: TestMigrationContext): Promise<string[]> {
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(TABLE)})`,
			)) as Array<{ name: string }>;
			return rows.map((row) => row.name);
		}
		const rows = (await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
			[`${context.tablePrefix}${TABLE}`],
		)) as Array<{ column_name: string }>;
		return rows.map((row) => row.column_name);
	}

	async function indexExists(context: TestMigrationContext): Promise<boolean> {
		const name = `IDX_${context.tablePrefix}${TABLE}_reportDate`;
		const rows = context.isSqlite
			? await context.runQuery<unknown[]>(
					"SELECT name FROM sqlite_master WHERE type = 'index' AND name = :name",
					{ name },
				)
			: await context.runQuery<unknown[]>(
					'SELECT indexname FROM pg_indexes WHERE indexname = :name',
					{ name },
				);
		return rows.length === 1;
	}

	describe('up', () => {
		it('backfills the UTC day each report was created on', async () => {
			const ids = await withContext(async (context) => ({
				morning: await insertReport(context, { createdAt: '2026-03-25 07:42:00.000+00:00' }),
				eastOfUtc: await insertReport(context, { createdAt: '2026-03-27 01:30:00.000+02:00' }),
				beforeMidnight: await insertReport(context, { createdAt: '2026-03-27 23:59:59.999+00:00' }),
			}));

			await runSingleMigration(MIGRATION_NAME);

			await expect(withContext(reportDates)).resolves.toEqual({
				[ids.morning]: '2026-03-25',
				[ids.eastOfUtc]: '2026-03-26',
				[ids.beforeMidnight]: '2026-03-27',
			});
		});

		it('keeps the day on the delivered row, then the skipped one, when several share it', async () => {
			const ids = await withContext(async (context) => ({
				pending: await insertReport(context, {
					createdAt: '2026-03-25 09:00:00.000+00:00',
					status: 'pending',
				}),
				skipped: await insertReport(context, {
					createdAt: '2026-03-25 08:00:00.000+00:00',
					status: 'skipped_after_max_retries',
				}),
				delivered: await insertReport(context, { createdAt: '2026-03-25 07:00:00.000+00:00' }),
				skippedAlone: await insertReport(context, {
					createdAt: '2026-03-26 08:00:00.000+00:00',
					status: 'skipped_after_max_retries',
				}),
				pendingNextToSkipped: await insertReport(context, {
					createdAt: '2026-03-26 09:00:00.000+00:00',
					status: 'pending',
				}),
			}));

			await runSingleMigration(MIGRATION_NAME);

			await expect(withContext(reportDates)).resolves.toEqual({
				[ids.pending]: null,
				[ids.skipped]: null,
				[ids.delivered]: '2026-03-25',
				[ids.skippedAlone]: '2026-03-26',
				[ids.pendingNextToSkipped]: null,
			});
		});

		it('settles a pending row that loses its day, so it is not sent again', async () => {
			const ids = await withContext(async (context) => ({
				delivered: await insertReport(context, { createdAt: '2026-03-25 07:00:00.000+00:00' }),
				pending: await insertReport(context, {
					createdAt: '2026-03-25 09:00:00.000+00:00',
					status: 'pending',
				}),
				pendingAlone: await insertReport(context, {
					createdAt: '2026-03-26 09:00:00.000+00:00',
					status: 'pending',
				}),
			}));

			await runSingleMigration(MIGRATION_NAME);

			await expect(withContext(statuses)).resolves.toEqual({
				[ids.delivered]: 'delivered',
				[ids.pending]: 'skipped_after_max_retries',
				[ids.pendingAlone]: 'pending',
			});
		});

		it('keeps the day on the newest row when rows with one status share it', async () => {
			const ids = await withContext(async (context) => ({
				older: await insertReport(context, { createdAt: '2026-03-25 07:00:00.000+00:00' }),
				newer: await insertReport(context, { createdAt: '2026-03-25 08:00:00.000+00:00' }),
			}));

			await runSingleMigration(MIGRATION_NAME);

			await expect(withContext(reportDates)).resolves.toEqual({
				[ids.older]: null,
				[ids.newer]: '2026-03-25',
			});
		});

		it('rejects a second report on a day that already has one', async () => {
			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				expect(await indexExists(context)).toBe(true);
				await insertReportOn(context, '2026-03-25');

				await expect(insertReportOn(context, '2026-03-25')).rejects.toThrow();
			});
		});

		it('accepts reports on other days and legacy rows without a day', async () => {
			await withContext(async (context) => {
				await insertReport(context, { createdAt: '2026-03-25 07:00:00.000+00:00' });
				await insertReport(context, { createdAt: '2026-03-25 08:00:00.000+00:00' });
				await insertReport(context, { createdAt: '2026-03-25 09:00:00.000+00:00' });
			});

			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				await insertReportOn(context, '2026-03-26');

				expect(Object.values(await reportDates(context)).sort()).toEqual([
					'2026-03-25',
					'2026-03-26',
					null,
					null,
				]);
			});
		});
	});

	describe('down', () => {
		it('drops the column and its index without deleting a report', async () => {
			await withContext(async (context) => {
				await insertReport(context, { createdAt: '2026-03-25 07:00:00.000+00:00' });
				await insertReport(context, { createdAt: '2026-03-25 08:00:00.000+00:00' });
			});
			await runSingleMigration(MIGRATION_NAME);

			await undoLastSingleMigration();

			await withContext(async (context) => {
				expect(await indexExists(context)).toBe(false);
				expect(await columnNames(context)).not.toContain('reportDate');
				const [{ count }] = (await context.queryRunner.query(
					`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName(TABLE)}`,
				)) as Array<{ count: number | string }>;
				expect(Number(count)).toBe(2);
			});
		});
	});
});
