import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, TableCheck } from '@n8n/typeorm';

const MIGRATION_NAME = 'AddTimeoutSecondsToScheduler1791452632250';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';

describe('AddTimeoutSecondsToScheduler Migration', () => {
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

	async function insertJob(context: TestMigrationContext, name: string, timeoutSeconds?: number) {
		const column = timeoutSeconds === undefined ? '' : ', "timeoutSeconds"';
		const value = timeoutSeconds === undefined ? '' : `, ${timeoutSeconds}`;
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_job')}
			   ("name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "createdAt", "updatedAt"${column})
			 VALUES ('${name}', 'interval', 60, 'test', 'workflow', 'wf-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP${value})`,
		);
	}

	async function insertTaskFor(
		context: TestMigrationContext,
		jobName: string,
		timeoutSeconds?: number,
	) {
		const [job] = (await context.queryRunner.query(
			`SELECT "id" FROM ${context.escape.tableName('scheduled_job')} WHERE "name" = '${jobName}'`,
		)) as Array<{ id: number }>;
		const column = timeoutSeconds === undefined ? '' : ', "timeoutSeconds"';
		const value = timeoutSeconds === undefined ? '' : `, ${timeoutSeconds}`;
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_task')}
			   ("jobId", "taskType", "scheduledFor", "runAt", "createdAt"${column})
			 VALUES (${job.id}, 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP${value})`,
		);
	}

	async function readTimeouts(context: TestMigrationContext, table: string): Promise<number[]> {
		const rows = (await context.queryRunner.query(
			`SELECT "timeoutSeconds" AS "timeout" FROM ${context.escape.tableName(table)}`,
		)) as Array<{ timeout: number }>;
		return rows.map((row) => Number(row.timeout));
	}

	async function countRows(context: TestMigrationContext, table: string): Promise<number> {
		const [{ count }] = (await context.queryRunner.query(
			`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName(table)}`,
		)) as Array<{ count: number | string }>;
		return Number(count);
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

	describe('up', () => {
		it('gives existing jobs and tasks the default timeout', async () => {
			const seeded = createTestMigrationContext(dataSource);
			await insertJob(seeded, 'job');
			await insertTaskFor(seeded, 'job');
			await seeded.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			expect(await readTimeouts(context, 'scheduled_job')).toEqual([300]);
			expect(await readTimeouts(context, 'scheduled_task')).toEqual([300]);
			await context.queryRunner.release();
		});

		it.each([1, 2147483])('stores a timeout of %s', async (timeoutSeconds) => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			await insertJob(context, 'job', timeoutSeconds);

			expect(await readTimeouts(context, 'scheduled_job')).toEqual([timeoutSeconds]);
			await context.queryRunner.release();
		});

		it.each([0, -1, 2147484])('rejects a timeout of %s', async (timeoutSeconds) => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			await expect(insertJob(context, 'job', timeoutSeconds)).rejects.toThrow();

			await context.queryRunner.release();
		});

		// Postgres coerces the value to `int` before the CHECK runs. SQLite stores it as given.
		it.skipIf(!isSqlite)('rejects a fractional timeout on SQLite', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			await expect(insertJob(context, 'job', 1.5)).rejects.toThrow();

			await context.queryRunner.release();
		});

		it.each([0, -1, 2147484])('rejects a task timeout of %s', async (timeoutSeconds) => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			await insertJob(context, 'job');

			await expect(insertTaskFor(context, 'job', timeoutSeconds)).rejects.toThrow();

			await context.queryRunner.release();
		});

		it.skipIf(!isSqlite)('rejects a fractional task timeout on SQLite', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			await insertJob(context, 'job');

			await expect(insertTaskFor(context, 'job', 1.5)).rejects.toThrow();

			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('drops the columns without deleting a job or a queued task', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const seeded = createTestMigrationContext(dataSource);
			await insertJob(seeded, 'job', 600);
			await insertTaskFor(seeded, 'job');
			await seeded.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await columnNames(context, 'scheduled_job')).not.toContain('timeoutSeconds');
			expect(await columnNames(context, 'scheduled_task')).not.toContain('timeoutSeconds');
			expect(await countRows(context, 'scheduled_job')).toBe(1);
			expect(await countRows(context, 'scheduled_task')).toBe(1);
			await context.queryRunner.release();
		});

		// On SQLite, a TypeORM rebuild turns the column CHECK into a table-level one,
		// and SQLite refuses to drop a column that a table-level CHECK names.
		it('drops the column after a later migration rebuilt the table', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const rebuilt = createTestMigrationContext(dataSource);
			const taskTable = `${rebuilt.tablePrefix}scheduled_task`;
			await rebuilt.queryRunner.getTable(taskTable);
			await rebuilt.queryRunner.createCheckConstraint(
				taskTable,
				new TableCheck({ name: 'CHK_rebuild_test', expression: '"attempts" >= 0' }),
			);
			await rebuilt.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await columnNames(context, 'scheduled_task')).not.toContain('timeoutSeconds');
			await context.queryRunner.release();
		});
	});

	// NOT VALID skips the scan of the existing rows, and still checks every new one.
	it.skipIf(isSqlite)('adds the CHECK on Postgres without validating existing rows', async () => {
		await runSingleMigration(MIGRATION_NAME);
		const context = createTestMigrationContext(dataSource);

		const rows = (await context.queryRunner.query(
			'SELECT convalidated FROM pg_constraint WHERE conname = $1',
			[`CHK_${context.tablePrefix}scheduled_task_timeoutSeconds`],
		)) as Array<{ convalidated: boolean }>;

		expect(rows).toEqual([{ convalidated: false }]);
		await context.queryRunner.release();
	});
});
