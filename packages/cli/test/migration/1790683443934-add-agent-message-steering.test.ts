import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION = 'AddAgentMessageSteering1790683443934';

describe('AddAgentMessageSteering migration', () => {
	let dataSource: DataSource;
	const projectId = randomUUID();
	const agentId = randomUUID();
	const threadId = randomUUID();
	const executionId = randomUUID();
	const steeringExecutionId = randomUUID();
	const messageIds = [randomUUID(), randomUUID(), randomUUID()];

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.clearDatabase();
		await ctx.queryRunner.release();
		await initDbUpToMigration(MIGRATION);
		const seed = createTestMigrationContext(dataSource);
		const values = { projectId, agentId, threadId, executionId, now: new Date() };
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
				`INSERT INTO ${seed.escape.tableName('agent_execution')} ("id", "threadId", "status") VALUES (:executionId, :threadId, 'running')`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_execution')} ("id", "threadId", "status") VALUES (:steeringExecutionId, :threadId, 'running')`,
				{ steeringExecutionId, threadId },
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
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_execution_message_links')} ("executionId", "messageId", "direction", "position") VALUES (:executionId, :messageId, 'input', 0)`,
				{ executionId, messageId: messageIds[0] },
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_message_queue')} ("threadId", "messageId", "payload", "executionId") VALUES (:threadId, :messageId, '{"kind":"preview"}', :executionId)`,
				{ ...values, messageId: messageIds[0] },
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_message_queue')} ("threadId", "messageId", "payload") VALUES (:threadId, :messageId, '{"kind":"preview"}')`,
				{ ...values, messageId: messageIds[1] },
			);
			// Retired IDs must stay retired when SQLite rebuilds the table.
			await seed.runQuery(
				`DELETE FROM ${seed.escape.tableName('agent_message_queue')} WHERE "executionId" IS NULL`,
			);
		} finally {
			await seed.queryRunner.release();
		}
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('keeps existing rows, foreign keys, and increasing queue IDs through up, down, and up', async () => {
		await runSingleMigration(MIGRATION);
		await dataSource.undoLastMigration({ transaction: 'none' });
		await runSingleMigration(MIGRATION);
		const ctx = createTestMigrationContext(dataSource);
		try {
			const executions = await ctx.runQuery<Array<{ acceptsSteering: boolean | number }>>(
				`SELECT "acceptsSteering" FROM ${ctx.escape.tableName('agent_execution')} WHERE "id" = :executionId`,
				{ executionId },
			);
			expect(Boolean(executions[0].acceptsSteering)).toBe(false);
			const rows = await ctx.runQuery<
				Array<{ executionId: string; steeringExecutionId: string | null }>
			>(
				`SELECT "executionId", "steeringExecutionId" FROM ${ctx.escape.tableName('agent_message_queue')}`,
			);
			expect(rows).toEqual([{ executionId, steeringExecutionId: null }]);
			expect(
				await ctx.runQuery(
					`SELECT "messageId" FROM ${ctx.escape.tableName('agent_execution_message_links')}`,
				),
			).toEqual([{ messageId: messageIds[0] }]);
			expect(
				await ctx.runQuery(`SELECT "id" FROM ${ctx.escape.tableName('agents_messages')}`),
			).toHaveLength(3);
			await expect(
				ctx.runQuery(
					`INSERT INTO ${ctx.escape.tableName('agent_message_queue')} ("threadId", "messageId", "payload") VALUES (:threadId, :messageId, '{"kind":"preview"}')`,
					{ threadId, messageId: messageIds[0] },
				),
			).rejects.toThrow();
			await ctx.runQuery(
				`INSERT INTO ${ctx.escape.tableName('agent_message_queue')} ("threadId", "messageId", "payload", "steeringExecutionId", "steeringOrder") VALUES (:threadId, :messageId, '{"kind":"preview"}', :steeringExecutionId, 1)`,
				{ threadId, steeringExecutionId, messageId: messageIds[1] },
			);
			const ids = await ctx.runQuery<Array<{ id: string | number }>>(
				`SELECT "id" FROM ${ctx.escape.tableName('agent_message_queue')} ORDER BY "id"`,
			);
			expect(Number(ids[1].id)).toBeGreaterThan(2);
			await expect(
				ctx.runQuery(
					`INSERT INTO ${ctx.escape.tableName('agent_message_queue')} ("threadId", "messageId", "payload", "steeringExecutionId", "steeringOrder") VALUES (:threadId, :messageId, '{"kind":"preview"}', :steeringExecutionId, 1)`,
					{ threadId, steeringExecutionId, messageId: messageIds[2] },
				),
			).rejects.toThrow();
			await expect(
				ctx.runQuery(
					`DELETE FROM ${ctx.escape.tableName('agent_execution')} WHERE "id" = :steeringExecutionId`,
					{ steeringExecutionId },
				),
			).rejects.toThrow();
			await ctx.runQuery(
				`DELETE FROM ${ctx.escape.tableName('agents_messages')} WHERE "id" = :messageId`,
				{ messageId: messageIds[0] },
			);
			expect(
				await ctx.runQuery(
					`SELECT "messageId" FROM ${ctx.escape.tableName('agent_message_queue')}`,
				),
			).toEqual([{ messageId: messageIds[1] }]);
			await ctx.runQuery(
				`DELETE FROM ${ctx.escape.tableName('agent_execution_threads')} WHERE "id" = :threadId`,
				{ threadId },
			);
			expect(
				await ctx.runQuery(`SELECT "id" FROM ${ctx.escape.tableName('agent_message_queue')}`),
			).toEqual([]);
		} finally {
			await ctx.queryRunner.release();
		}
	});
});
