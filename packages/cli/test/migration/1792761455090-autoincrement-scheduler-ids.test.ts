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

const MIGRATION_NAME = 'AutoincrementSchedulerIds1792761455090';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';
const tables = ['scheduled_job', 'scheduled_task'];

type TableSchema = {
	definition: string;
	columns: unknown[];
	indexes: string[];
	foreignKeys: unknown[];
};

describe.skipIf(!isSqlite)('AutoincrementSchedulerIds migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertJob(context: TestMigrationContext, id: number) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('scheduled_job')}
			   ("id", "name", "kind", "intervalSeconds", "taskType", "ownerType", "ownerId", "createdAt", "updatedAt")
			 VALUES (:id, :name, 'interval', 60, 'test', 'workflow', 'wf-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id, name: `job-${id}` },
		);
	}

	async function insertTask(
		context: TestMigrationContext,
		jobId: number,
		scheduledFor: string,
		id?: number,
	): Promise<number> {
		const task = context.escape.tableName('scheduled_task');
		await context.runQuery(
			`INSERT INTO ${task} ("id", "jobId", "taskType", "scheduledFor", "runAt", "createdAt")
			 VALUES (:id, :jobId, 'test', :scheduledFor, :scheduledFor, CURRENT_TIMESTAMP)`,
			{ id: id ?? null, jobId, scheduledFor },
		);
		const [{ id: insertedId }] = await context.runQuery<{ id: number }[]>(
			`SELECT "id" FROM ${task} WHERE "jobId" = :jobId AND "scheduledFor" = :scheduledFor`,
			{ jobId, scheduledFor },
		);
		return insertedId;
	}

	async function seed(context: TestMigrationContext) {
		await insertJob(context, 3);
		await insertJob(context, 7);
		await insertTask(context, 3, '2026-01-01 00:00:00.000', 5);
		await insertTask(context, 7, '2026-01-01 00:00:00.000', 9);
	}

	async function readIds(context: TestMigrationContext, table: string): Promise<number[]> {
		const rows = await context.runQuery<{ id: number }[]>(
			`SELECT "id" FROM ${context.escape.tableName(table)} ORDER BY "id"`,
		);
		return rows.map((row) => row.id);
	}

	async function readTaskJobIds(context: TestMigrationContext): Promise<number[]> {
		const rows = await context.runQuery<{ jobId: number }[]>(
			`SELECT "jobId" FROM ${context.escape.tableName('scheduled_task')} ORDER BY "id"`,
		);
		return rows.map((row) => row.jobId);
	}

	async function readSchema(context: TestMigrationContext, table: string): Promise<TableSchema> {
		const name = `${context.tablePrefix}${table}`;
		const [{ sql: definition }] = await context.runQuery<{ sql: string }[]>(
			"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = :name",
			{ name },
		);
		const indexes = await context.runQuery<{ sql: string }[]>(
			"SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = :name AND sql IS NOT NULL ORDER BY name",
			{ name },
		);
		const columns = await context.runQuery<unknown[]>(`PRAGMA table_xinfo("${name}")`);
		const foreignKeys = await context.runQuery<unknown[]>(`PRAGMA foreign_key_list("${name}")`);
		return { definition, columns, indexes: indexes.map((index) => index.sql), foreignKeys };
	}

	async function readSequence(context: TestMigrationContext, table: string) {
		const rows = await context.runQuery<{ seq: number }[]>(
			'SELECT seq FROM sqlite_sequence WHERE name = :name',
			{ name: `${context.tablePrefix}${table}` },
		);
		return rows.map((row) => row.seq);
	}

	async function hasSequenceTable(context: TestMigrationContext) {
		const rows = await context.runQuery<unknown[]>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'",
		);
		return rows.length === 1;
	}

	describe('up', () => {
		it('changes only the id key to AUTOINCREMENT', async () => {
			const before = await withContext(
				async (context) =>
					await Promise.all(tables.map(async (table) => await readSchema(context, table))),
			);

			await runSingleMigration(MIGRATION_NAME);

			const after = await withContext(
				async (context) =>
					await Promise.all(tables.map(async (table) => await readSchema(context, table))),
			);
			for (const [index, schema] of after.entries()) {
				expect(schema.definition).toContain('"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL');
				expect({
					...schema,
					definition: schema.definition.replace(' AUTOINCREMENT', ''),
				}).toEqual(before[index]);
			}
			expect(after[0].indexes.length).toBeGreaterThan(0);
			expect(after[1].indexes.length).toBeGreaterThan(0);
			expect(after[1].foreignKeys).toEqual([
				expect.objectContaining({ table: 'scheduled_job', from: 'jobId', on_delete: 'CASCADE' }),
			]);
		});

		it('keeps every row and id, and starts the sequence at the highest id', async () => {
			await withContext(seed);

			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				expect(await readIds(context, 'scheduled_job')).toEqual([3, 7]);
				expect(await readIds(context, 'scheduled_task')).toEqual([5, 9]);
				expect(await readTaskJobIds(context)).toEqual([3, 7]);
				expect(await readSequence(context, 'scheduled_job')).toEqual([7]);
				expect(await readSequence(context, 'scheduled_task')).toEqual([9]);
			});
		});

		it('gives a new task a fresh id after the highest task is deleted', async () => {
			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				const task = context.escape.tableName('scheduled_task');
				await insertJob(context, 1);
				await insertTask(context, 1, '2026-01-01 00:00:00.000');
				const highestId = await insertTask(context, 1, '2026-01-02 00:00:00.000');
				await context.runQuery(`DELETE FROM ${task} WHERE "id" = :id`, { id: highestId });

				const newId = await insertTask(context, 1, '2026-01-03 00:00:00.000');

				expect(newId).toBeGreaterThan(highestId);
			});
		});
	});

	describe('down', () => {
		it('restores the rowid tables and keeps every row and id', async () => {
			const before = await withContext(
				async (context) =>
					await Promise.all(tables.map(async (table) => await readSchema(context, table))),
			);
			await withContext(seed);
			await runSingleMigration(MIGRATION_NAME);

			await undoLastSingleMigration();

			await withContext(async (context) => {
				for (const [index, table] of tables.entries()) {
					expect(await readSchema(context, table)).toEqual(before[index]);
					if (await hasSequenceTable(context)) {
						expect(await readSequence(context, table)).toEqual([]);
					}
				}
				expect(await readIds(context, 'scheduled_job')).toEqual([3, 7]);
				expect(await readIds(context, 'scheduled_task')).toEqual([5, 9]);
				expect(await readTaskJobIds(context)).toEqual([3, 7]);
			});
		});
	});
});
