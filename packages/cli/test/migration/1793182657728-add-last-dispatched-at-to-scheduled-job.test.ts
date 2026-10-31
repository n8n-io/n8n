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

const MIGRATION_NAME = 'AddLastDispatchedAtToScheduledJob1793182657728';

describe('AddLastDispatchedAtToScheduledJob Migration', () => {
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

	async function insertJob(context: TestMigrationContext, name: string) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_job')}
			   ("name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "createdAt", "updatedAt")
			 VALUES ('${name}', 'interval', 60, 'test', 'workflow', 'wf-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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

	async function readLastDispatchedAt(context: TestMigrationContext): Promise<unknown[]> {
		const rows = (await context.queryRunner.query(
			`SELECT "lastDispatchedAt" AS "value" FROM ${context.escape.tableName('scheduled_job')}`,
		)) as Array<{ value: unknown }>;
		return rows.map((row) => row.value);
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
		it('leaves lastDispatchedAt null on existing jobs', async () => {
			const seeded = createTestMigrationContext(dataSource);
			await insertJob(seeded, 'job');
			await seeded.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);
			expect(await readLastDispatchedAt(context)).toEqual([null]);
			await context.queryRunner.release();
		});

		it('stores a timestamp with millisecond precision', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			await insertJob(context, 'job');

			await context.runQuery(
				`UPDATE ${context.escape.tableName('scheduled_job')} SET "lastDispatchedAt" = '2026-01-02 03:04:05.678'`,
			);

			// SQLite stores the text as given; Postgres returns a Date.
			const [value] = await readLastDispatchedAt(context);
			const stored =
				value instanceof Date ? value.toISOString() : `${String(value).replace(' ', 'T')}Z`;
			expect(stored).toBe('2026-01-02T03:04:05.678Z');
			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('drops the column without deleting a job or a queued task', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const seeded = createTestMigrationContext(dataSource);
			await insertJob(seeded, 'job');
			await insertTaskFor(seeded, 'job');
			await seeded.queryRunner.release();

			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await columnNames(context, 'scheduled_job')).not.toContain('lastDispatchedAt');
			expect(await countRows(context, 'scheduled_job')).toBe(1);
			expect(await countRows(context, 'scheduled_task')).toBe(1);
			await context.queryRunner.release();
		});
	});
});
