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

const migrationName = 'AddAgentTaskStopBoundary1791461354235';

describe('AddAgentTaskStopBoundary migration', () => {
	const threadId = randomUUID();
	const executionId = randomUUID();

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insert(
		context: TestMigrationContext,
		table: string,
		values: Record<string, string>,
	) {
		const columns = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)}
			 (${columns.map(context.escape.columnName).join(', ')})
			 VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	}

	async function readThreads() {
		return await withContext(
			async ({ escape, runQuery }) =>
				await runQuery(`SELECT * FROM ${escape.tableName('agent_execution_threads')}`),
		);
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
		await withContext(async (context) => {
			const projectId = randomUUID();
			const agentId = randomUUID();
			await insert(context, 'project', { id: projectId, name: 'Stop test project', type: 'team' });
			await insert(context, 'agents', {
				id: agentId,
				projectId,
				name: 'Stop test agent',
				integrations: '[]',
				tools: '{}',
				skills: '{}',
			});
			await insert(context, 'agent_execution_threads', {
				id: threadId,
				projectId,
				agentId,
				agentName: 'Stop test agent',
			});
			await insert(context, 'agent_execution', { id: executionId, threadId, status: 'success' });
		});
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('preserves chats and their execution records through upgrade, rollback, and reapplication', async () => {
		const original = await readThreads();
		await runSingleMigration(migrationName);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix, isSqlite }) => {
			expect(
				(await queryRunner.getTable(`${tablePrefix}agent_execution_threads`))?.findColumnByName(
					'taskStop',
				),
			).toMatchObject({
				isNullable: true,
				type: isSqlite ? 'text' : 'json',
			});
			expect(
				await runQuery(
					`SELECT ${escape.columnName('taskStop')} FROM ${escape.tableName('agent_execution_threads')}`,
				),
			).toEqual([{ taskStop: null }]);
			await runQuery(
				`UPDATE ${escape.tableName('agent_execution_threads')} SET ${escape.columnName('taskStop')} = :stop WHERE ${escape.columnName('id')} = :threadId`,
				{ threadId, stop: JSON.stringify({ requestedAt: '2026-10-08T10:00:00.000Z' }) },
			);
		});
		await undoLastSingleMigration();
		expect(await readThreads()).toEqual(original);
		await withContext(async ({ queryRunner, tablePrefix }) => {
			expect(
				(await queryRunner.getTable(`${tablePrefix}agent_execution_threads`))?.findColumnByName(
					'taskStop',
				),
			).toBeUndefined();
		});
		await runSingleMigration(migrationName);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			expect(
				await runQuery(
					`SELECT ${escape.columnName('id')} FROM ${escape.tableName('agent_execution')}`,
				),
			).toEqual([{ id: executionId }]);
			expect(await queryRunner.hasTable(`${tablePrefix}agent_task_cancellation`)).toBe(false);
		});
	});
});
