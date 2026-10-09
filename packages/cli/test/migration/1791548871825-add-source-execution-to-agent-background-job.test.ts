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

const migrationName = 'AddSourceExecutionToAgentBackgroundJob1791548871825';

describe('Agent background job source migration', () => {
	const threadId = randomUUID();
	const executionId = randomUUID();
	const jobId = randomUUID();

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
			await insert(context, 'agent_background_job', {
				id: jobId,
				parentAgentId: agentId,
				parentThreadId: threadId,
				parentResourceId: 'draft-chat:test',
				parentPrincipalHash: 'principal',
				title: 'Saved result',
				kind: 'workflow',
				status: 'completed',
				result: '{"completed":true}',
			});
		});
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('preserves jobs and supports source deletion, rollback, and reapplication', async () => {
		await runSingleMigration(migrationName);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			const table = await queryRunner.getTable(`${tablePrefix}agent_background_job`);
			expect(table?.findColumnByName('sourceExecutionId')).toMatchObject({ isNullable: true });
			expect(
				table?.foreignKeys.filter((key) => key.columnNames.includes('sourceExecutionId')),
			).toHaveLength(1);
			expect(table?.findColumnByName('detached')).toBeUndefined();
			expect(
				(await queryRunner.getTable(`${tablePrefix}agent_message_queue`))?.findColumnByName('held'),
			).toBeUndefined();
			await runQuery(
				`UPDATE ${escape.tableName('agent_background_job')} SET ${escape.columnName('sourceExecutionId')} = :executionId WHERE ${escape.columnName('id')} = :jobId`,
				{ executionId, jobId },
			);
			await runQuery(
				`DELETE FROM ${escape.tableName('agent_execution')} WHERE ${escape.columnName('id')} = :executionId`,
				{ executionId },
			);
			expect(
				await runQuery(
					`SELECT ${escape.columnName('sourceExecutionId')}, ${escape.columnName('result')} FROM ${escape.tableName('agent_background_job')}`,
				),
			).toEqual([{ sourceExecutionId: null, result: '{"completed":true}' }]);
		});
		await undoLastSingleMigration();
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			expect(
				(await queryRunner.getTable(`${tablePrefix}agent_background_job`))?.findColumnByName(
					'sourceExecutionId',
				),
			).toBeUndefined();
			expect(
				await runQuery(
					`SELECT ${escape.columnName('result')} FROM ${escape.tableName('agent_background_job')}`,
				),
			).toEqual([{ result: '{"completed":true}' }]);
		});
		await runSingleMigration(migrationName);
		await withContext(async ({ queryRunner, tablePrefix }) => {
			const table = await queryRunner.getTable(`${tablePrefix}agent_background_job`);
			expect(
				table?.foreignKeys.filter((key) => key.columnNames.includes('sourceExecutionId')),
			).toHaveLength(1);
		});
	});
});
