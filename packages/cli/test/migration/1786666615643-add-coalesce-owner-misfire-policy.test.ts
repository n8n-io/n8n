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

const MIGRATION_NAME = 'AddCoalesceOwnerMisfirePolicy1786666615643';

const SCHEDULE_TRIGGER_TASK_TYPE = 'workflow:schedule-trigger';
const SYSTEM_TASK_TYPE = 'system:prune-executions';

describe('AddCoalesceOwnerMisfirePolicy Migration', () => {
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

	async function insertJob(
		context: TestMigrationContext,
		name: string,
		taskType: string,
		misfirePolicy: string,
	) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_job')}
			   ("name", "kind", "intervalSeconds", "taskType", "misfirePolicy", "createdAt", "updatedAt")
			 VALUES ('${name}', 'interval', 60, '${taskType}', '${misfirePolicy}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
	}

	async function insertTaskFor(context: TestMigrationContext, jobName: string) {
		const [job] = (await context.queryRunner.query(
			`SELECT "id" FROM ${context.escape.tableName('scheduled_job')} WHERE "name" = '${jobName}'`,
		)) as Array<{ id: number }>;
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_task')}
			   ("jobId", "taskType", "scheduledFor", "runAt", "createdAt")
			 VALUES (${job.id}, 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
	}

	async function policies(context: TestMigrationContext): Promise<Record<string, string>> {
		const rows = (await context.queryRunner.query(
			`SELECT "name", "misfirePolicy" FROM ${context.escape.tableName('scheduled_job')}`,
		)) as Array<{ name: string; misfirePolicy: string }>;
		return Object.fromEntries(rows.map((row) => [row.name, row.misfirePolicy]));
	}

	async function countRows(context: TestMigrationContext, table: string): Promise<number> {
		const [{ count }] = (await context.queryRunner.query(
			`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName(table)}`,
		)) as Array<{ count: number | string }>;
		return Number(count);
	}

	async function taskJobNames(context: TestMigrationContext): Promise<string[]> {
		const rows = (await context.queryRunner.query(
			`SELECT "job"."name" AS "name"
			   FROM ${context.escape.tableName('scheduled_task')} "task"
			   INNER JOIN ${context.escape.tableName('scheduled_job')} "job" ON "job"."id" = "task"."jobId"`,
		)) as Array<{ name: string }>;
		return rows.map((row) => row.name).sort();
	}

	async function foreignKeyViolations(context: TestMigrationContext): Promise<unknown[]> {
		if (!context.isSqlite) return [];
		return (await context.queryRunner.query(
			`PRAGMA foreign_key_check(${context.escape.tableName('scheduled_task')})`,
		)) as unknown[];
	}

	async function columnNames(context: TestMigrationContext, table: string): Promise<string[]> {
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(table)})`,
			)) as Array<{ name: string }>;
			return rows.map((row) => row.name);
		}
		const rows = (await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
			[`${context.tablePrefix}${table}`],
		)) as Array<{ column_name: string }>;
		return rows.map((row) => row.column_name);
	}

	async function jobIndexDefinitions(context: TestMigrationContext): Promise<string[]> {
		const table = `${context.tablePrefix}scheduled_job`;
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = '${table}'`,
			)) as Array<{ sql: string | null }>;
			return rows.map((row) => row.sql ?? '');
		}
		const rows = (await context.queryRunner.query(
			'SELECT indexdef FROM pg_indexes WHERE tablename = $1',
			[table],
		)) as Array<{ indexdef: string }>;
		return rows.map((row) => row.indexdef);
	}

	async function seedJobsAndTasks() {
		const context = createTestMigrationContext(dataSource);
		await insertJob(context, 'trigger_a', SCHEDULE_TRIGGER_TASK_TYPE, 'coalesce');
		await insertJob(context, 'trigger_b', SCHEDULE_TRIGGER_TASK_TYPE, 'coalesce');
		await insertJob(context, 'trigger_skip', SCHEDULE_TRIGGER_TASK_TYPE, 'skip');
		await insertJob(context, 'system_job', SYSTEM_TASK_TYPE, 'coalesce');
		await insertJob(context, 'system_skip', SYSTEM_TASK_TYPE, 'skip');
		await insertTaskFor(context, 'trigger_a');
		await insertTaskFor(context, 'system_job');
		await context.queryRunner.release();
	}

	describe('up', () => {
		it('accepts coalesce_owner and still rejects an unknown policy', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			await expect(
				insertJob(context, 'owner', SCHEDULE_TRIGGER_TASK_TYPE, 'coalesce_owner'),
			).resolves.not.toThrow();
			await expect(
				insertJob(context, 'garbage', SCHEDULE_TRIGGER_TASK_TYPE, 'not_a_policy'),
			).rejects.toThrow();

			await context.queryRunner.release();
		});

		it('keeps queued occurrences pointing at the jobs they belonged to', async () => {
			await seedJobsAndTasks();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			expect(await countRows(context, 'scheduled_task')).toBe(2);
			expect(await taskJobNames(context)).toEqual(['system_job', 'trigger_a']);
			expect(await foreignKeyViolations(context)).toEqual([]);
			await context.queryRunner.release();
		});

		it('keeps every job row, the other CHECK constraints and the indexes', async () => {
			await seedJobsAndTasks();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			expect(await countRows(context, 'scheduled_job')).toBe(5);
			expect(await columnNames(context, 'scheduled_job')).toEqual(
				expect.arrayContaining([
					'misfirePolicy',
					'misfireGraceSeconds',
					'recurrenceUnit',
					'recurrenceSize',
				]),
			);
			expect(await columnNames(context, 'scheduled_task')).toContain('missedAfter');

			await expect(
				context.runQuery(
					`INSERT INTO ${context.escape.tableName('scheduled_job')}
					   ("name", "kind", "intervalSeconds", "taskType", "createdAt", "updatedAt")
					 VALUES ('bad_kind', 'nonsense', 60, 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				),
			).rejects.toThrow();
			await expect(
				context.runQuery(
					`INSERT INTO ${context.escape.tableName('scheduled_job')}
					   ("name", "kind", "intervalSeconds", "taskType", "misfireGraceSeconds", "createdAt", "updatedAt")
					 VALUES ('bad_grace', 'interval', 60, 'test', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				),
			).rejects.toThrow();

			const definitions = await jobIndexDefinitions(context);
			expect(definitions.some((sql) => sql.includes('nextRunAt'))).toBe(true);
			expect(definitions.some((sql) => sql.includes('workflowId'))).toBe(true);
			expect(definitions.some((sql) => sql.includes('name'))).toBe(true);

			await context.queryRunner.release();
		});

		it('moves schedule trigger jobs from coalesce to skip, leaving other task types alone', async () => {
			await seedJobsAndTasks();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			expect(await policies(context)).toEqual({
				trigger_a: 'skip',
				trigger_b: 'skip',
				trigger_skip: 'skip',
				system_job: 'coalesce',
				system_skip: 'skip',
			});
			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('moves every trigger policy back to coalesce without deleting a job or a task', async () => {
			await seedJobsAndTasks();
			await runSingleMigration(MIGRATION_NAME);
			// Simulates a job a user later moved onto coalesce_owner.
			const seeded = createTestMigrationContext(dataSource);
			await insertJob(seeded, 'trigger_owner', SCHEDULE_TRIGGER_TASK_TYPE, 'coalesce_owner');
			await seeded.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await policies(context)).toEqual({
				trigger_a: 'coalesce',
				trigger_b: 'coalesce',
				// Seeded as skip before up(), so it cannot be told apart from the
				// rows up() moved to skip; down() folds it to coalesce with them.
				trigger_skip: 'coalesce',
				trigger_owner: 'coalesce',
				system_job: 'coalesce',
				// Not a schedule trigger, so neither direction touches it.
				system_skip: 'skip',
			});
			expect(await countRows(context, 'scheduled_job')).toBe(6);
			expect(await countRows(context, 'scheduled_task')).toBe(2);
			expect(await taskJobNames(context)).toEqual(['system_job', 'trigger_a']);
			expect(await foreignKeyViolations(context)).toEqual([]);
			await context.queryRunner.release();
		});

		it('narrows the CHECK back so coalesce_owner is rejected', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			await expect(
				insertJob(context, 'owner', SCHEDULE_TRIGGER_TASK_TYPE, 'coalesce_owner'),
			).rejects.toThrow();
			await expect(
				insertJob(context, 'plain', SCHEDULE_TRIGGER_TASK_TYPE, 'coalesce'),
			).resolves.not.toThrow();

			await context.queryRunner.release();
		});
	});
});
