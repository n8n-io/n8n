import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION = 'AddAgentMessageQueuePosition1790853539575';

describe('AddAgentMessageQueuePosition migration', () => {
	let dataSource: DataSource;
	const projectId = randomUUID();
	const agentId = randomUUID();
	const threadIds = [randomUUID(), randomUUID()];
	const executionId = randomUUID();
	const messageIds = Array.from({ length: 5 }, () => randomUUID());
	let retiredId: number;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const cleanup = createTestMigrationContext(dataSource);
		try {
			await cleanup.queryRunner.clearDatabase();
		} finally {
			await cleanup.queryRunner.release();
		}
		await initDbUpToMigration(MIGRATION);
		const ctx = createTestMigrationContext(dataSource);
		try {
			const table = ctx.escape.tableName;
			const column = ctx.escape.columnName;
			await ctx.runQuery(
				`INSERT INTO ${table('project')} (${column('id')}, ${column('name')}, ${column('type')}, ${column('createdAt')}, ${column('updatedAt')}) VALUES (:projectId, 'Project', 'team', :now, :now)`,
				{ projectId, now: new Date() },
			);
			await ctx.runQuery(
				`INSERT INTO ${table('agents')} (${column('id')}, ${column('name')}, ${column('projectId')}, ${column('integrations')}, ${column('tools')}, ${column('skills')}) VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}')`,
				{ agentId, projectId },
			);
			for (const threadId of threadIds) {
				await ctx.runQuery(
					`INSERT INTO ${table('agent_execution_threads')} (${column('id')}, ${column('agentId')}, ${column('agentName')}, ${column('projectId')}) VALUES (:threadId, :agentId, 'Agent', :projectId)`,
					{ threadId, agentId, projectId },
				);
				await ctx.runQuery(
					`INSERT INTO ${table('agents_resources')} (${column('id')}) VALUES (:threadId)`,
					{ threadId },
				);
				await ctx.runQuery(
					`INSERT INTO ${table('agents_threads')} (${column('id')}, ${column('resourceId')}) VALUES (:threadId, :threadId)`,
					{ threadId },
				);
			}
			await ctx.runQuery(
				`INSERT INTO ${table('agent_execution')} (${column('id')}, ${column('threadId')}, ${column('status')}) VALUES (:executionId, :threadId, 'running')`,
				{ executionId, threadId: threadIds[0] },
			);
			for (const [index, messageId] of messageIds.entries()) {
				const threadId = threadIds[index === 1 || index === 4 ? 1 : 0];
				await ctx.runQuery(
					`INSERT INTO ${table('agents_messages')} (${column('id')}, ${column('threadId')}, ${column('resourceId')}, ${column('role')}, ${column('content')}) VALUES (:messageId, :threadId, :threadId, 'user', :content)`,
					{ messageId, threadId, content: JSON.stringify({ role: 'user', content: 'Input' }) },
				);
				await ctx.runQuery(
					`INSERT INTO ${table('agent_message_queue')} (${column('threadId')}, ${column('messageId')}, ${column('payload')}, ${column('executionId')}, ${column('steeringExecutionId')}, ${column('steeringOrder')}) VALUES (:threadId, :messageId, '{"kind":"preview"}', :executionId, :steeringExecutionId, :steeringOrder)`,
					{
						threadId,
						messageId,
						executionId: index === 0 ? executionId : null,
						steeringExecutionId: index === 2 ? executionId : null,
						steeringOrder: index === 2 ? 1 : null,
					},
				);
			}
			const [last] = await ctx.runQuery<Array<{ id: string | number }>>(
				`SELECT ${column('id')} FROM ${table('agent_message_queue')} WHERE ${column('messageId')} = :messageId`,
				{ messageId: messageIds[4] },
			);
			retiredId = Number(last.id);
			await ctx.runQuery(
				`DELETE FROM ${table('agent_message_queue')} WHERE ${column('messageId')} = :messageId`,
				{ messageId: messageIds[4] },
			);
		} finally {
			await ctx.queryRunner.release();
		}
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('preserves each session order and active reservations through up, down, and up', async () => {
		await runSingleMigration(MIGRATION);
		await dataSource.undoLastMigration({ transaction: 'none' });
		await runSingleMigration(MIGRATION);
		const ctx = createTestMigrationContext(dataSource);
		const table = ctx.escape.tableName;
		const column = ctx.escape.columnName;
		try {
			const rows = await ctx.runQuery(
				`SELECT ${column('messageId')}, ${column('position')}, ${column('executionId')}, ${column('steeringExecutionId')}, ${column('steeringOrder')} FROM ${table('agent_message_queue')} ORDER BY ${column('id')}`,
			);
			expect(rows).toEqual([
				{
					messageId: messageIds[0],
					position: 0,
					executionId,
					steeringExecutionId: null,
					steeringOrder: null,
				},
				{
					messageId: messageIds[1],
					position: 0,
					executionId: null,
					steeringExecutionId: null,
					steeringOrder: null,
				},
				{
					messageId: messageIds[2],
					position: 1,
					executionId: null,
					steeringExecutionId: executionId,
					steeringOrder: 1,
				},
				{
					messageId: messageIds[3],
					position: 2,
					executionId: null,
					steeringExecutionId: null,
					steeringOrder: null,
				},
			]);
			await ctx.runQuery(
				`INSERT INTO ${table('agent_message_queue')} (${column('threadId')}, ${column('messageId')}, ${column('payload')}, ${column('position')}) VALUES (:threadId, :messageId, '{"kind":"preview"}', 1)`,
				{ threadId: threadIds[1], messageId: messageIds[4] },
			);
			const [inserted] = await ctx.runQuery<Array<{ id: string | number }>>(
				`SELECT ${column('id')} FROM ${table('agent_message_queue')} WHERE ${column('messageId')} = :messageId`,
				{ messageId: messageIds[4] },
			);
			expect(Number(inserted.id)).toBeGreaterThan(retiredId);
		} finally {
			await ctx.queryRunner.release();
		}
	});
});
