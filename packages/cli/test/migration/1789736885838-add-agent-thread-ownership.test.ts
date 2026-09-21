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

const migrationName = 'AddAgentThreadOwnership1789736885838';

describe('Agent thread ownership migration', () => {
	let dataSource: DataSource;
	const ownerId = randomUUID();
	const projectId = randomUUID();
	const agentId = randomUUID();
	const now = new Date('2026-09-01T12:00:00Z');
	const fixtures = [
		{ id: 'memory', resource: `draft-chat:${ownerId}`, ownerId, accessScope: 'user' },
		{ id: `test-${agentId}:${ownerId}`, accessScope: 'user' },
		{ id: `test-${agentId}:workflow`, source: 'workflow', accessScope: 'project' },
		{ id: 'missing-user', resource: `draft-chat:${randomUUID()}`, accessScope: 'user' },
		{ id: 'unknown', accessScope: 'user' },
		{ id: 'integration', resource: 'integration:slack:U123', accessScope: 'project' },
		{ id: 'workflow', source: 'workflow', accessScope: 'project' },
		{ id: 'task', taskId: 'task-1', accessScope: 'project' },
		{ id: 'task-source', source: 'task', accessScope: 'project' },
		{ id: 'preview-source', taskId: 'task-2', source: 'mcp', accessScope: 'user' },
		{
			id: 'private-child',
			source: 'subagent',
			parentThreadId: 'memory',
			parentAgentId: agentId,
			ownerId,
			accessScope: 'user',
		},
		{
			id: 'project-child',
			source: 'subagent',
			parentThreadId: 'workflow',
			parentAgentId: agentId,
			accessScope: 'project',
		},
		{
			id: 'invalid-child',
			source: 'subagent',
			parentThreadId: 'memory',
			parentAgentId: randomUUID(),
			accessScope: 'user',
		},
		{
			id: 'mixed',
			resource: `draft-chat:${ownerId}`,
			source: 'slack',
			ownerId,
			accessScope: 'user',
		},
	];

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
		await withContext(async ({ escape, runQuery }) => {
			const table = escape.tableName;
			await runQuery(`INSERT INTO ${table('user')} ("id") VALUES (:ownerId)`, { ownerId });
			await runQuery(
				`INSERT INTO ${table('project')} ("id", "name", "type", "createdAt", "updatedAt") VALUES (:projectId, 'Project', 'team', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${table('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt") VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			for (const fixture of fixtures) {
				await runQuery(
					`INSERT INTO ${table('agent_execution_threads')} ("id", "agentId", "agentName", "projectId", "taskId", "parentThreadId", "parentAgentId", "createdAt", "updatedAt") VALUES (:id, :agentId, 'Agent', :projectId, :taskId, :parentThreadId, :parentAgentId, :now, :now)`,
					{
						id: fixture.id,
						agentId,
						projectId,
						taskId: fixture.taskId ?? null,
						parentThreadId: fixture.parentThreadId ?? null,
						parentAgentId: fixture.parentAgentId ?? null,
						now,
					},
				);
				await runQuery(
					`INSERT INTO ${table('agent_execution')} ("id", "threadId", "status", "source", "createdAt", "updatedAt") VALUES (:id, :threadId, 'success', :source, :now, :now)`,
					{
						id: randomUUID(),
						threadId: fixture.id,
						source: fixture.source ?? null,
						now,
					},
				);
				if (fixture.resource) {
					await runQuery(
						`INSERT INTO ${table('agents_threads')} ("id", "resourceId") VALUES (:id, :resourceId)`,
						{ id: fixture.id, resourceId: fixture.resource },
					);
				}
			}
		});
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('backfills session access and preserves execution rows', async () => {
		await runSingleMigration(migrationName);
		dataSource = Container.get(DataSource);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			const threads = await runQuery<
				Array<{ id: string; ownerId: string | null; accessScope: string }>
			>(
				`SELECT "id", "ownerId", "accessScope" FROM ${escape.tableName('agent_execution_threads')}`,
			);
			for (const fixture of fixtures) {
				expect(threads.find((thread) => thread.id === fixture.id)).toEqual({
					id: fixture.id,
					ownerId: fixture.ownerId ?? null,
					accessScope: fixture.accessScope,
				});
			}
			expect(
				await runQuery(`SELECT "threadId" FROM ${escape.tableName('agent_execution')}`),
			).toHaveLength(fixtures.length);
			const table = await queryRunner.getTable(`${tablePrefix}agent_execution_threads`);
			expect(table?.indices.some((index) => index.columnNames.includes('ownerId'))).toBe(true);
			expect(table?.foreignKeys.filter((key) => key.columnNames.includes('ownerId'))).toHaveLength(
				1,
			);
			const checkpointTable = await queryRunner.getTable(`${tablePrefix}agent_checkpoints`);
			expect(
				checkpointTable?.indices.some(
					(index) => index.columnNames.length === 1 && index.columnNames[0] === 'threadId',
				),
			).toBe(true);
		});

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			const table = await queryRunner.getTable(`${tablePrefix}agent_execution_threads`);
			expect(
				table?.columns.some((column) => column.name === 'ownerId' || column.name === 'accessScope'),
			).toBe(false);
			expect(
				await runQuery(`SELECT "threadId" FROM ${escape.tableName('agent_execution')}`),
			).toHaveLength(fixtures.length);
			const checkpointTable = await queryRunner.getTable(`${tablePrefix}agent_checkpoints`);
			expect(
				checkpointTable?.indices.some(
					(index) => index.columnNames.length === 1 && index.columnNames[0] === 'threadId',
				),
			).toBe(false);
		});

		await runSingleMigration(migrationName);
		dataSource = Container.get(DataSource);
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(`DELETE FROM ${escape.tableName('user')} WHERE "id" = :ownerId`, { ownerId });
			expect(
				await runQuery(
					`SELECT "ownerId", "accessScope" FROM ${escape.tableName('agent_execution_threads')} WHERE "id" = 'memory'`,
				),
			).toEqual([{ ownerId: null, accessScope: 'user' }]);
		});
	});
});
