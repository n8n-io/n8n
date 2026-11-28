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

const migration = 'CreateAssistantUsageEventTable1795853247971';
const table = 'assistant_usage_event';

describe('Create Assistant usage event table migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);

		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertEvent(
		{ escape, runQuery }: TestMigrationContext,
		type: string,
		resourceId: string | null,
	) {
		const columns = ['type', 'threadId', 'resourceId'].map(escape.columnName).join(', ');
		await runQuery(
			`INSERT INTO ${escape.tableName(table)} (${columns}) VALUES (:type, 'thread-1', :resourceId)`,
			{ type, resourceId },
		);
	}

	it('creates the table with keys to users and projects that are cleared on delete', async () => {
		await runSingleMigration(migration);

		await withContext(async ({ queryRunner, tablePrefix }) => {
			const created = await queryRunner.getTable(`${tablePrefix}${table}`);
			expect(created?.columns.map((column) => column.name).sort()).toEqual([
				'cacheReadTokens',
				'cacheWriteTokens',
				'createdAt',
				'id',
				'inputTokens',
				'model',
				'outputTokens',
				'projectId',
				'resourceId',
				'threadId',
				'type',
				'userId',
			]);
			expect(
				created?.foreignKeys
					.map((foreignKey) => [foreignKey.columnNames[0], foreignKey.onDelete])
					.sort(),
			).toEqual([
				['projectId', 'SET NULL'],
				['userId', 'SET NULL'],
			]);
			// Postgres lists the columns of an index in alphabetical order.
			const resourceIndex = created?.indices.find(
				(index) => [...index.columnNames].sort().join() === 'resourceId,type',
			);
			expect(resourceIndex?.isUnique).toBe(true);
		});
	});

	it('keeps one row for each created resource, and any number of rows without one', async () => {
		await runSingleMigration(migration);

		await withContext(async (context) => {
			await insertEvent(context, 'workflow-created', 'wf-1');
			await expect(insertEvent(context, 'workflow-created', 'wf-1')).rejects.toThrow();
			await insertEvent(context, 'agent-created', 'wf-1');
			await insertEvent(context, 'message', null);
			await insertEvent(context, 'message', null);

			const rows = await context.runQuery<Array<{ count: number | string }>>(
				`SELECT COUNT(*) AS count FROM ${context.escape.tableName(table)}`,
			);
			expect(Number(rows[0].count)).toBe(4);
		});
	});

	it('refuses an unknown event type', async () => {
		await runSingleMigration(migration);

		await withContext(async (context) => {
			await expect(insertEvent(context, 'workflow-deleted', null)).rejects.toThrow();
		});
	});

	it('drops the table on revert, and creates it again', async () => {
		await runSingleMigration(migration);
		await undoLastSingleMigration();

		await withContext(async ({ queryRunner, tablePrefix }) => {
			expect(await queryRunner.hasTable(`${tablePrefix}${table}`)).toBe(false);
		});

		await runSingleMigration(migration);

		await withContext(async ({ queryRunner, tablePrefix }) => {
			expect(await queryRunner.hasTable(`${tablePrefix}${table}`)).toBe(true);
		});
	});
});
