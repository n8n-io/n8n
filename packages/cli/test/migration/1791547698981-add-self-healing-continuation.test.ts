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

const migration = 'AddSelfHealingContinuation1791547698981';

describe('Self-healing continuation migration', () => {
	const investigatorId = randomUUID();
	const reviewerId = randomUUID();
	const projectId = randomUUID();
	const workflowId = randomUUID();
	const resultId = randomUUID();
	const threadId = randomUUID();
	const messageId = randomUUID();

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
		await withContext(async (context) => {
			await insert(context, 'user', { id: investigatorId });
			await insert(context, 'user', { id: reviewerId });
			await insert(context, 'project', {
				id: projectId,
				name: 'Continuation test',
				type: 'personal',
			});
			await insert(context, 'workflow_entity', {
				id: workflowId,
				name: 'Continuation test',
				active: false,
				versionId: randomUUID(),
				nodes: '[]',
				connections: '{}',
			});
			await insert(context, 'self_healing_result', {
				id: resultId,
				workflowId,
				projectId,
				backgroundUserId: investigatorId,
				outcome: 'could_not_fix',
				summary: 'Check the source data',
				report: 'The request has no order number.',
				completedAt: '2026-10-09T12:00:00.000Z',
				executionId: 'retained-execution',
				usage: '{}',
			});
			await insert(context, 'instance_ai_threads', {
				id: threadId,
				resourceId: reviewerId,
				projectId,
			});
			await insert(context, 'instance_ai_messages', {
				id: messageId,
				threadId,
				role: 'user',
				content: '{"content":"Saved message"}',
			});
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

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
		values: Record<string, string | boolean>,
	) {
		const names = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)} (${names.map(context.escape.columnName).join(', ')})
			 VALUES (${names.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	}

	async function expectSavedData(context: TestMigrationContext) {
		for (const [table, id] of [
			['self_healing_result', resultId],
			['instance_ai_threads', threadId],
			['instance_ai_messages', messageId],
		]) {
			const rows = await context.runQuery<unknown[]>(
				`SELECT * FROM ${context.escape.tableName(table)} WHERE ${context.escape.columnName('id')} = :id`,
				{ id },
			);
			expect(rows).toHaveLength(1);
		}
	}

	it('preserves reports and chat messages across migration, rollback, and reapplication', async () => {
		await runSingleMigration(migration);
		await withContext(expectSavedData);
		await undoLastSingleMigration();
		await withContext(expectSavedData);
		await runSingleMigration(migration);
		await withContext(expectSavedData);

		await withContext(async (context) => {
			const table = context.escape.tableName;
			const column = context.escape.columnName;
			await context.runQuery(
				`UPDATE ${table('instance_ai_threads')} SET ${column('selfHealingResultId')} = :resultId
			 WHERE ${column('id')} = :threadId`,
				{ resultId, threadId },
			);
			await context.runQuery(
				`UPDATE ${table('self_healing_result')} SET ${column('continuedAt')} = CURRENT_TIMESTAMP,
			 ${column('continuedById')} = :reviewerId, ${column('continuationDestination')} = 'chat',
			 ${column('continuationThreadId')} = :threadId WHERE ${column('id')} = :resultId`,
				{ reviewerId, threadId, resultId },
			);
			await context.runQuery(
				`DELETE FROM ${table('instance_ai_threads')} WHERE ${column('id')} = :threadId`,
				{ threadId },
			);
			await context.runQuery(`DELETE FROM ${table('user')} WHERE ${column('id')} = :reviewerId`, {
				reviewerId,
			});
			const [result] = await context.runQuery<
				Array<{
					continuedAt: unknown;
					continuedById: string | null;
					continuationThreadId: string | null;
				}>
			>(
				`SELECT ${column('continuedAt')}, ${column('continuedById')}, ${column('continuationThreadId')}
			 FROM ${table('self_healing_result')} WHERE ${column('id')} = :resultId`,
				{ resultId },
			);
			expect(result.continuedAt).not.toBeNull();
			expect(result.continuedById).toBeNull();
			expect(result.continuationThreadId).toBeNull();
		});
	});
});
