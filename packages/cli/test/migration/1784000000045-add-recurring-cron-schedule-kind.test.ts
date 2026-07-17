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

const MIGRATION_NAME = 'AddRecurringCronScheduleKind1784000000045';

describe('AddRecurringCronScheduleKind Migration', () => {
	let dataSource: DataSource;
	let seededJobId: number;

	async function insertJob(
		context: TestMigrationContext,
		values: Record<string, unknown> = {},
	): Promise<number> {
		const table = context.escape.tableName('scheduled_job');
		const now = new Date();
		const name = `job-${randomUUID()}`;
		const row: Record<string, unknown> = {
			name,
			taskType: 'scheduleTrigger',
			kind: 'cron',
			cronExpression: '0 * * * * *',
			createdAt: now,
			updatedAt: now,
			...values,
		};
		const columns = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(', ')})
			 VALUES (${columns.map((c) => `:${c}`).join(', ')})`,
			row,
		);
		const [inserted] = await context.runQuery<Array<{ id: number }>>(
			`SELECT "id" FROM ${table} WHERE "name" = :name`,
			{ name },
		);
		return inserted.id;
	}

	async function getColumnNames(context: TestMigrationContext): Promise<string[]> {
		if (context.isSqlite) {
			const rows = await context.runQuery<Array<{ name: string }>>(
				`PRAGMA table_info(${context.escape.tableName('scheduled_job')})`,
			);
			return rows.map((row) => row.name);
		}
		const rows = await context.runQuery<Array<{ column_name: string }>>(
			'SELECT column_name FROM information_schema.columns WHERE table_name = :tableName',
			{ tableName: `${context.tablePrefix}scheduled_job` },
		);
		return rows.map((row) => row.column_name);
	}

	async function insertTask(context: TestMigrationContext, jobId: number): Promise<void> {
		const scheduledFor = new Date('2026-02-02T02:02:02.000Z');
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_task')} ("jobId", "taskType", "scheduledFor", "runAt", "createdAt")
			 VALUES (:jobId, :taskType, :scheduledFor, :runAt, :createdAt)`,
			{
				jobId,
				taskType: 'scheduleTrigger',
				scheduledFor,
				runAt: scheduledFor,
				createdAt: new Date(),
			},
		);
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		let context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		// Seed a job with a queued occurrence in the pre-migration schema, to
		// prove the SQLite table recreation does not cascade them away.
		context = createTestMigrationContext(dataSource);
		seededJobId = await insertJob(context);
		await insertTask(context, seededJobId);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('keeps pre-existing jobs and their queued occurrences', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			const [job] = await context.runQuery<
				Array<{ kind: string; recurrenceUnit: string | null; recurrenceSize: number | null }>
			>(
				`SELECT "kind", "recurrenceUnit", "recurrenceSize" FROM ${context.escape.tableName('scheduled_job')} WHERE "id" = :id`,
				{ id: seededJobId },
			);
			expect(job).toMatchObject({ kind: 'cron', recurrenceUnit: null, recurrenceSize: null });

			const tasks = await context.runQuery<unknown[]>(
				`SELECT "id" FROM ${context.escape.tableName('scheduled_task')} WHERE "jobId" = :jobId`,
				{ jobId: seededJobId },
			);
			expect(tasks).toHaveLength(1);
		} finally {
			await context.queryRunner.release();
		}
	});

	it('accepts a recurring_cron job carrying its anchor and gate', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			const jobId = await insertJob(context, {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			});
			const [job] = await context.runQuery<
				Array<{ recurrenceUnit: string; recurrenceSize: number }>
			>(
				`SELECT "recurrenceUnit", "recurrenceSize" FROM ${context.escape.tableName('scheduled_job')} WHERE "id" = :id`,
				{ id: jobId },
			);
			expect(job.recurrenceUnit).toBe('weeks');
			expect(Number(job.recurrenceSize)).toBe(3);
		} finally {
			await context.queryRunner.release();
		}
	});

	it('keeps the pre-existing per-kind presence checks intact', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			await expect(insertJob(context, { kind: 'cron', cronExpression: null })).rejects.toThrow();
			await expect(
				insertJob(context, { kind: 'interval', cronExpression: null }),
			).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('still rejects an out-of-set kind', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			await expect(insertJob(context, { kind: 'lunar' })).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('rejects a recurring_cron job missing its gate columns', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			await expect(insertJob(context, { kind: 'recurring_cron' })).rejects.toThrow();
			await expect(
				insertJob(context, { kind: 'recurring_cron', recurrenceUnit: 'weeks' }),
			).rejects.toThrow();
			await expect(
				insertJob(context, { kind: 'recurring_cron', recurrenceSize: 3 }),
			).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('rejects a recurring_cron job missing its anchor cron expression', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			await expect(
				insertJob(context, {
					kind: 'recurring_cron',
					cronExpression: null,
					recurrenceUnit: 'weeks',
					recurrenceSize: 3,
				}),
			).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('rejects an out-of-set recurrence unit on any row', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			await expect(
				insertJob(context, {
					kind: 'recurring_cron',
					recurrenceUnit: 'fortnights',
					recurrenceSize: 3,
				}),
			).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('rejects a recurrence size below 2 on any row', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			await expect(
				insertJob(context, {
					kind: 'recurring_cron',
					recurrenceUnit: 'weeks',
					recurrenceSize: 1,
				}),
			).rejects.toThrow();
		} finally {
			await context.queryRunner.release();
		}
	});

	it('keeps the job -> task CASCADE intact after the table recreation', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			const jobId = await insertJob(context);
			await insertTask(context, jobId);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('scheduled_job')} WHERE "id" = :id`,
				{ id: jobId },
			);

			const tasks = await context.runQuery<unknown[]>(
				`SELECT "id" FROM ${context.escape.tableName('scheduled_task')} WHERE "jobId" = :jobId`,
				{ jobId },
			);
			expect(tasks).toHaveLength(0);
		} finally {
			await context.queryRunner.release();
		}
	});

	// Declared last: the revert would undo the schema the tests above assert on.
	describe('down', () => {
		it('restores the pre-migration schema, keeping other kinds and dropping recurring_cron rows', async () => {
			let context = createTestMigrationContext(dataSource);
			const recurringJobId = await insertJob(context, {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			});
			await insertTask(context, recurringJobId);
			await context.queryRunner.release();

			await undoLastSingleMigration();

			context = createTestMigrationContext(dataSource);
			try {
				const jobTable = context.escape.tableName('scheduled_job');
				const taskTable = context.escape.tableName('scheduled_task');

				// The seeded cron job and its queued occurrence survive the revert.
				const [job] = await context.runQuery<Array<{ kind: string }>>(
					`SELECT "kind" FROM ${jobTable} WHERE "id" = :id`,
					{ id: seededJobId },
				);
				expect(job.kind).toBe('cron');
				const seededTasks = await context.runQuery<unknown[]>(
					`SELECT "id" FROM ${taskTable} WHERE "jobId" = :jobId`,
					{ jobId: seededJobId },
				);
				expect(seededTasks).toHaveLength(1);

				// The recurring_cron job and its occurrence are gone.
				const recurringJobs = await context.runQuery<unknown[]>(
					`SELECT "id" FROM ${jobTable} WHERE "id" = :id`,
					{ id: recurringJobId },
				);
				expect(recurringJobs).toHaveLength(0);
				const recurringTasks = await context.runQuery<unknown[]>(
					`SELECT "id" FROM ${taskTable} WHERE "jobId" = :jobId`,
					{ jobId: recurringJobId },
				);
				expect(recurringTasks).toHaveLength(0);

				// The kind CHECK is narrowed again and the recurrence columns are gone.
				await expect(insertJob(context, { kind: 'recurring_cron' })).rejects.toThrow();
				const columns = await getColumnNames(context);
				expect(columns).toContain('kind');
				expect(columns).not.toContain('recurrenceUnit');
				expect(columns).not.toContain('recurrenceSize');
			} finally {
				await context.queryRunner.release();
			}

			// The revert leaves a state up() applies cleanly to again.
			await runSingleMigration(MIGRATION_NAME);
		});
	});
});
