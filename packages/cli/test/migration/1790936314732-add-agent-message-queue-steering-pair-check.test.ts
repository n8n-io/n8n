import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION = 'AddAgentMessageQueueSteeringPairCheck1790936314732';

describe('AddAgentMessageQueueSteeringPairCheck migration', () => {
	let dataSource: DataSource;
	const projectId = randomUUID();
	const agentId = randomUUID();
	const threadId = randomUUID();
	const steeringExecutionId = randomUUID();
	const messageIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];

	const insertQueueItem = async (
		ctx: ReturnType<typeof createTestMigrationContext>,
		messageId: string,
		steering: { executionId?: string; order?: number } = {},
	) =>
		await ctx.runQuery(
			`INSERT INTO ${ctx.escape.tableName('agent_message_queue')} ("threadId", "messageId", "payload", "steeringExecutionId", "steeringOrder") VALUES (:threadId, :messageId, '{"kind":"preview"}', :executionId, :order)`,
			{
				threadId,
				messageId,
				executionId: steering.executionId ?? null,
				order: steering.order ?? null,
			},
		);

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.clearDatabase();
		await ctx.queryRunner.release();
		await initDbUpToMigration(MIGRATION);
		const seed = createTestMigrationContext(dataSource);
		const values = { projectId, agentId, threadId, steeringExecutionId, now: new Date() };
		try {
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt") VALUES (:projectId, 'Project', 'team', :now, :now)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills") VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}')`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_execution_threads')} ("id", "agentId", "agentName", "projectId") VALUES (:threadId, :agentId, 'Agent', :projectId)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_execution')} ("id", "threadId", "status") VALUES (:steeringExecutionId, :threadId, 'running')`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agents_resources')} ("id") VALUES (:threadId)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agents_threads')} ("id", "resourceId") VALUES (:threadId, :threadId)`,
				values,
			);
			for (const id of messageIds) {
				await seed.runQuery(
					`INSERT INTO ${seed.escape.tableName('agents_messages')} ("id", "threadId", "resourceId", "role", "content") VALUES (:id, :threadId, :threadId, 'user', :content)`,
					{
						id,
						threadId,
						content: JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Input' }] }),
					},
				);
			}
			await insertQueueItem(seed, messageIds[0], { executionId: steeringExecutionId, order: 1 });
			await insertQueueItem(seed, messageIds[1], { executionId: steeringExecutionId });
			await insertQueueItem(seed, messageIds[2], { order: 2 });
			// Retired IDs must stay retired when SQLite rebuilds the table.
			await insertQueueItem(seed, messageIds[3]);
			await seed.runQuery(
				`DELETE FROM ${seed.escape.tableName('agent_message_queue')} WHERE "messageId" = :messageId`,
				{ messageId: messageIds[3] },
			);
		} finally {
			await seed.queryRunner.release();
		}
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('releases half-set reservations and rejects new ones through up, down, and up', async () => {
		await runSingleMigration(MIGRATION);
		await dataSource.undoLastMigration({ transaction: 'none' });
		await runSingleMigration(MIGRATION);
		const ctx = createTestMigrationContext(dataSource);
		try {
			const rows = await ctx.runQuery<
				Array<{
					messageId: string;
					steeringExecutionId: string | null;
					steeringOrder: number | null;
				}>
			>(
				`SELECT "messageId", "steeringExecutionId", "steeringOrder" FROM ${ctx.escape.tableName('agent_message_queue')} ORDER BY "id"`,
			);
			expect(rows).toEqual([
				{ messageId: messageIds[0], steeringExecutionId, steeringOrder: 1 },
				{ messageId: messageIds[1], steeringExecutionId: null, steeringOrder: null },
				{ messageId: messageIds[2], steeringExecutionId: null, steeringOrder: null },
			]);
			await expect(
				insertQueueItem(ctx, messageIds[4], { executionId: steeringExecutionId }),
			).rejects.toThrow();
			await expect(insertQueueItem(ctx, messageIds[4], { order: 3 })).rejects.toThrow();
			await insertQueueItem(ctx, messageIds[4], { executionId: steeringExecutionId, order: 2 });
			const ids = await ctx.runQuery<Array<{ id: string | number }>>(
				`SELECT "id" FROM ${ctx.escape.tableName('agent_message_queue')} ORDER BY "id"`,
			);
			expect(Number(ids[3].id)).toBeGreaterThan(4);
		} finally {
			await ctx.queryRunner.release();
		}
	});
});
