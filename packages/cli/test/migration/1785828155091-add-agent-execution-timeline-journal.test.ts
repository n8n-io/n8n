import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddAgentExecutionTimelineJournal1785828155091';

describe('AddAgentExecutionTimelineJournal migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let executionId: string;
	let threadId: string;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		const projectId = randomUUID();
		const agentId = randomUUID();
		threadId = randomUUID();
		executionId = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, 'team', :createdAt, :updatedAt)`,
			{ id: projectId, name: 'Project', createdAt: now, updatedAt: now },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id: agentId,
				name: 'Agent',
				projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution_threads')}
			 ("id", "agentId", "agentName", "projectId", "createdAt", "updatedAt")
			 VALUES (:id, :agentId, :agentName, :projectId, :createdAt, :updatedAt)`,
			{ id: threadId, agentId, agentName: 'Agent', projectId, createdAt: now, updatedAt: now },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution')}
			 ("id", "threadId", "status", "duration", "storedAt", "createdAt", "updatedAt")
			 VALUES (:id, :threadId, 'success', 0, 'db', :createdAt, :updatedAt)`,
			{ id: executionId, threadId, createdAt: now, updatedAt: now },
		);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('preserves existing executions and durably journals every new execution status', async () => {
		const ctx = createTestMigrationContext(dataSource);
		const executionTable = ctx.escape.tableName('agent_execution');
		const journalTable = ctx.escape.tableName('agent_execution_timeline_journal');

		const existing = await ctx.runQuery<Array<{ runId: string | null }>>(
			`SELECT "runId" FROM ${executionTable} WHERE "id" = :id`,
			{ id: executionId },
		);
		expect(existing).toEqual([{ runId: null }]);
		expect(
			(await ctx.queryRunner.getTable(`${ctx.tablePrefix}agent_execution`))?.indices.some(
				(index) => index.columnNames[0] === 'status',
			),
		).toBe(true);

		for (const status of ['running', 'cancelled', 'interrupted']) {
			await expect(
				ctx.runQuery(`UPDATE ${executionTable} SET "status" = :status WHERE "id" = :id`, {
					id: executionId,
					status,
				}),
			).resolves.not.toThrow();
		}
		await ctx.runQuery(
			`INSERT INTO ${journalTable} ("executionId", "seq", "event", "createdAt", "updatedAt")
			 VALUES (:executionId, 1, :event, :createdAt, :updatedAt)`,
			{
				executionId,
				event: JSON.stringify({ type: 'text', content: 'Partial', timestamp: 1 }),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
		const events = await ctx.runQuery<Array<{ event: string }>>(
			`SELECT "event" FROM ${journalTable} WHERE "executionId" = :executionId ORDER BY "seq"`,
			{ executionId },
		);
		expect(events.map(({ event }) => JSON.parse(event))).toEqual([
			{ type: 'text', content: 'Partial', timestamp: 1 },
		]);
		await ctx.runQuery(`DELETE FROM ${executionTable} WHERE "id" = :id`, { id: executionId });
		expect(
			await ctx.runQuery(`SELECT "seq" FROM ${journalTable} WHERE "executionId" = :executionId`, {
				executionId,
			}),
		).toEqual([]);
		const now = new Date();
		await ctx.runQuery(
			`INSERT INTO ${executionTable}
			 ("id", "threadId", "status", "duration", "storedAt", "createdAt", "updatedAt")
			 VALUES (:id, :threadId, 'interrupted', 0, 'db', :createdAt, :updatedAt)`,
			{ id: executionId, threadId, createdAt: now, updatedAt: now },
		);
		await ctx.queryRunner.release();
	});

	it('cascades journal cleanup and safely maps new statuses on rollback', async () => {
		await dataSource.undoLastMigration({ transaction: 'each' });
		const ctx = createTestMigrationContext(dataSource);
		const executionTable = ctx.escape.tableName('agent_execution');
		const row = await ctx.runQuery<Array<{ status: string }>>(
			`SELECT "status" FROM ${executionTable} WHERE "id" = :id`,
			{ id: executionId },
		);
		expect(row).toEqual([{ status: 'error' }]);
		expect(
			await ctx.queryRunner.hasTable(`${ctx.tablePrefix}agent_execution_timeline_journal`),
		).toBe(false);
		expect(
			(await ctx.queryRunner.getTable(`${ctx.tablePrefix}agent_execution`))?.columns.some(
				(column) => column.name === 'runId',
			),
		).toBe(false);
		await ctx.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});
});
