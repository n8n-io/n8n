import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'AddAutoincrementToScheduledTaskId1794321432114';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';

describe.skipIf(!isSqlite)('AddAutoincrementToScheduledTaskId migration', () => {
	let dataSource: DataSource;
	let jobId: number;
	let seededTasks: Array<Record<string, unknown>>;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertTask(
		context: TestMigrationContext,
		values: Record<string, unknown>,
	): Promise<void> {
		const columns = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_task')} (${columns.map((c) => context.escape.columnName(c)).join(', ')})
			 VALUES (${columns.map((c) => `:${c}`).join(', ')})`,
			values,
		);
	}

	async function readTasks(context: TestMigrationContext) {
		return await context.runQuery<Array<Record<string, unknown>>>(
			`SELECT * FROM ${context.escape.tableName('scheduled_task')} ORDER BY ${context.escape.columnName('id')}`,
		);
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const jobColumns = [
				'name',
				'kind',
				'intervalSeconds',
				'taskType',
				'ownerType',
				'ownerId',
				'createdAt',
				'updatedAt',
			].map((c) => context.escape.columnName(c));
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('scheduled_job')} (${jobColumns.join(', ')})
				 VALUES ('job', 'interval', 60, 'test', 'workflow', 'wf-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			);
			const [job] = await context.runQuery<Array<{ id: number }>>(
				`SELECT ${context.escape.columnName('id')} FROM ${context.escape.tableName('scheduled_job')} WHERE ${context.escape.columnName('name')} = 'job'`,
			);
			jobId = job.id;

			await insertTask(context, {
				jobId,
				taskType: 'test',
				scheduledFor: '2026-01-01 00:00:00.000',
				runAt: '2026-01-01 00:00:00.000',
				createdAt: '2026-01-01 00:00:00.000',
			});
			await insertTask(context, {
				jobId,
				taskType: 'test',
				payload: '{"a":1}',
				scheduledFor: '2026-01-01 00:01:00.000',
				runAt: '2026-01-01 00:01:00.000',
				status: 'running',
				attempts: 1,
				maxAttempts: 3,
				claimedBy: 'host-a',
				leaseExpiresAt: '2026-01-01 00:02:00.000',
				leaseEpoch: 4,
				startedAt: '2026-01-01 00:01:00.000',
				createdAt: '2026-01-01 00:01:00.000',
			});
			await insertTask(context, {
				jobId,
				taskType: 'test',
				scheduledFor: '2026-01-01 00:02:00.000',
				runAt: '2026-01-01 00:02:00.000',
				status: 'failed',
				attempts: 1,
				finishedAt: '2026-01-01 00:02:30.000',
				errorMessage: 'boom',
				createdAt: '2026-01-01 00:02:00.000',
			});
			seededTasks = await readTasks(context);
		});

		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('keeps the ids and data of existing tasks', async () => {
		await withContext(async (context) => {
			expect(seededTasks).toHaveLength(3);
			expect(await readTasks(context)).toEqual(seededTasks);
		});
	});

	it('does not reuse the id of a deleted newest task', async () => {
		await withContext(async (context) => {
			const table = context.escape.tableName('scheduled_task');
			const id = context.escape.columnName('id');
			const [{ maxId }] = await context.runQuery<Array<{ maxId: number }>>(
				`SELECT MAX(${id}) AS "maxId" FROM ${table}`,
			);
			await context.runQuery(`DELETE FROM ${table} WHERE ${id} = :maxId`, { maxId });

			await insertTask(context, {
				jobId,
				taskType: 'test',
				scheduledFor: '2026-01-01 00:03:00.000',
				runAt: '2026-01-01 00:03:00.000',
				createdAt: '2026-01-01 00:03:00.000',
			});

			const [{ newId }] = await context.runQuery<Array<{ newId: number }>>(
				`SELECT MAX(${id}) AS "newId" FROM ${table}`,
			);
			expect(newId).toBeGreaterThan(maxId);
		});
	});

	it('keeps the ids and data of existing tasks on rollback', async () => {
		const before = await withContext(readTasks);

		await undoLastSingleMigration();

		expect(await withContext(readTasks)).toEqual(before);
	});
});
