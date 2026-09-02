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

const MIGRATION_NAME = 'AddMisfirePolicyToScheduler1785247194307';

describe('AddMisfirePolicyToScheduler Migration', () => {
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

	async function indexedColumns(context: TestMigrationContext): Promise<string[]> {
		const table = `${context.tablePrefix}scheduled_task`;
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

	describe('up', () => {
		it('adds the policy columns to the job and the deadline to the task', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			expect(await columnNames(context, 'scheduled_job')).toEqual(
				expect.arrayContaining(['misfirePolicy', 'misfireGraceSeconds']),
			);
			expect(await columnNames(context, 'scheduled_task')).toContain('missedAfter');

			await context.queryRunner.release();
		});

		it('defaults existing jobs to coalesce, so no row needs a backfill', async () => {
			const before = createTestMigrationContext(dataSource);
			await before.runQuery(
				`INSERT INTO ${before.escape.tableName('scheduled_job')}
				   ("name", "kind", "intervalSeconds", "taskType", "createdAt", "updatedAt")
				 VALUES ('existing', 'interval', 60, 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			);
			await before.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			const [row] = (await context.queryRunner.query(
				`SELECT "misfirePolicy", "misfireGraceSeconds" FROM ${context.escape.tableName('scheduled_job')}`,
			)) as Array<{ misfirePolicy: string; misfireGraceSeconds: number }>;

			expect(row.misfirePolicy).toBe('coalesce');
			expect(Number(row.misfireGraceSeconds)).toBe(60);

			await context.queryRunner.release();
		});

		it('is a no-op when replayed under a different recorded migration name', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			// Deleting the migrations-table row, with the columns left in place, is
			// what a rename looks like from the next run's perspective.
			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('migrations')} WHERE "name" = '${MIGRATION_NAME}'`,
			);
			await context.queryRunner.release();

			await expect(runSingleMigration(MIGRATION_NAME)).resolves.not.toThrow();

			const after = createTestMigrationContext(dataSource);
			expect(await columnNames(after, 'scheduled_job')).toEqual(
				expect.arrayContaining(['misfirePolicy', 'misfireGraceSeconds']),
			);
			await after.queryRunner.release();
		});

		it('indexes the deadline over the pending rows the reaper sweeps', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			const definitions = await indexedColumns(context);
			expect(
				definitions.some((sql) => sql.includes('missedAfter') && sql.includes('pending')),
			).toBe(true);

			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('removes every column it added', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			const jobColumns = await columnNames(context, 'scheduled_job');

			expect(jobColumns).not.toContain('misfirePolicy');
			expect(jobColumns).not.toContain('misfireGraceSeconds');
			expect(await columnNames(context, 'scheduled_task')).not.toContain('missedAfter');

			await context.queryRunner.release();
		});

		it('keeps queued occurrences, which the job table rebuild would cascade away', async () => {
			await runSingleMigration(MIGRATION_NAME);

			const seed = createTestMigrationContext(dataSource);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('scheduled_job')}
				   ("name", "kind", "intervalSeconds", "taskType", "createdAt", "updatedAt")
				 VALUES ('queued', 'interval', 60, 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			);
			const [job] = (await seed.queryRunner.query(
				`SELECT "id" FROM ${seed.escape.tableName('scheduled_job')}`,
			)) as Array<{ id: number }>;
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('scheduled_task')}
				   ("jobId", "taskType", "scheduledFor", "runAt", "createdAt")
				 VALUES (${job.id}, 'test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			);
			await seed.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			const [{ count }] = (await context.queryRunner.query(
				`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName('scheduled_task')}`,
			)) as Array<{ count: number | string }>;

			expect(Number(count)).toBe(1);

			await context.queryRunner.release();
		});
	});
});
