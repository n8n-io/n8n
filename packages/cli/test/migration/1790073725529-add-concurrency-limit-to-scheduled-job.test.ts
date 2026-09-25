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

const MIGRATION_NAME = 'AddConcurrencyLimitToScheduledJob1790073725529';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';

describe('AddConcurrencyLimitToScheduledJob Migration', () => {
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
		concurrencyLimit: number | null,
	) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_job')}
			   ("name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "concurrencyLimit", "createdAt", "updatedAt")
			 VALUES ('${name}', 'interval', 60, 'test', 'workflow', 'wf-1', ${concurrencyLimit ?? 'NULL'}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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

	async function readLimit(context: TestMigrationContext, name: string): Promise<number | null> {
		const [row] = (await context.queryRunner.query(
			`SELECT "concurrencyLimit" AS "limit" FROM ${context.escape.tableName('scheduled_job')} WHERE "name" = '${name}'`,
		)) as Array<{ limit: number | null }>;
		return row.limit;
	}

	async function countRows(context: TestMigrationContext, table: string): Promise<number> {
		const [{ count }] = (await context.queryRunner.query(
			`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName(table)}`,
		)) as Array<{ count: number | string }>;
		return Number(count);
	}

	async function indexExists(context: TestMigrationContext, name: string): Promise<boolean> {
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

	const limitIndexName = (context: TestMigrationContext) =>
		`IDX_${context.tablePrefix}scheduled_job_concurrencyLimit`;

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
		it.each([null, 1, 2147483647])('stores a limit of %s', async (concurrencyLimit) => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			await insertJob(context, 'job', concurrencyLimit);

			expect(await readLimit(context, 'job')).toBe(concurrencyLimit);
			await context.queryRunner.release();
		});

		it.each([0, -1, 2147483648])('rejects a limit of %s', async (concurrencyLimit) => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			await expect(insertJob(context, 'job', concurrencyLimit)).rejects.toThrow();

			await context.queryRunner.release();
		});

		it('indexes the jobs that carry a limit', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			expect(await indexExists(context, limitIndexName(context))).toBe(true);

			await context.queryRunner.release();
		});

		// Postgres has no fractional case to reject: the column type coerces the
		// value before the CHECK runs. SQLite stores it as given.
		it.skipIf(!isSqlite)('rejects a fractional limit on SQLite', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			await expect(insertJob(context, 'job', 1.5)).rejects.toThrow();

			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('drops the column without deleting a job or a queued task', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const seeded = createTestMigrationContext(dataSource);
			await insertJob(seeded, 'job', 2);
			await insertTaskFor(seeded, 'job');
			await seeded.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await indexExists(context, limitIndexName(context))).toBe(false);
			expect(await columnNames(context, 'scheduled_job')).not.toContain('concurrencyLimit');
			expect(await countRows(context, 'scheduled_job')).toBe(1);
			expect(await countRows(context, 'scheduled_task')).toBe(1);
			await context.queryRunner.release();
		});
	});
});
