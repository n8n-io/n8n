import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION = 'AddAgentMessageSteering1790259878851';

describe('AddAgentMessageSteering migration', () => {
	let dataSource: DataSource;
	const projectId = randomUUID();
	const agentId = randomUUID();
	const threadId = randomUUID();
	const executionId = randomUUID();
	const steeringExecutionId = randomUUID();

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
				`INSERT INTO ${seed.escape.tableName('agent_message_queue')} ("threadId", "source", "payload", "executionId") VALUES (:threadId, 'chat', '{}', :executionId)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_message_queue')} ("threadId", "source", "payload") VALUES (:threadId, 'chat', '{}')`,
				values,
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
			await ctx.runQuery(
				`INSERT INTO ${ctx.escape.tableName('agent_message_queue')} ("threadId", "source", "payload", "steeringExecutionId", "steeringOrder") VALUES (:threadId, 'chat', '{}', :steeringExecutionId, 1)`,
				{ threadId, steeringExecutionId },
			);
			const ids = await ctx.runQuery<Array<{ id: string | number }>>(
				`SELECT "id" FROM ${ctx.escape.tableName('agent_message_queue')} ORDER BY "id"`,
			);
			expect(Number(ids[1].id)).toBeGreaterThan(2);
			await expect(
				ctx.runQuery(
					`INSERT INTO ${ctx.escape.tableName('agent_message_queue')} ("threadId", "source", "payload", "steeringExecutionId", "steeringOrder") VALUES (:threadId, 'chat', '{}', :steeringExecutionId, 1)`,
					{ threadId, steeringExecutionId },
				),
			).rejects.toThrow();
			await expect(
				ctx.runQuery(
					`DELETE FROM ${ctx.escape.tableName('agent_execution')} WHERE "id" = :steeringExecutionId`,
					{ steeringExecutionId },
				),
			).rejects.toThrow();
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
