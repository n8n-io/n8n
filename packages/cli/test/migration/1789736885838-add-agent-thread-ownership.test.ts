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
	const otherOwnerId = randomUUID();
	const projectId = randomUUID();
	const agentId = randomUUID();
	const legacyId = `test-${agentId}:${ownerId}`;
	const now = new Date('2026-09-01T12:00:00Z');
	const fixtures = [
		{ id: 'memory', resource: `draft-chat:${ownerId}`, expectedOwner: ownerId },
		{ id: legacyId, expectedOwner: ownerId },
		{ id: `test-${agentId}` },
		{ id: 'checkpoint', checkpoint: `draft-chat:${ownerId}`, expectedOwner: ownerId },
		{ id: 'retained', checkpoint: `draft-chat:${ownerId}`, expired: true, expectedOwner: ownerId },
		{ id: 'child', parent: 'memory', expectedOwner: ownerId },
		{ id: 'grandchild', parent: 'child', expectedOwner: ownerId },
		{ id: 'integration', source: 'slack', shared: true },
		{ id: 'workflow', source: 'workflow', shared: true },
		{ id: 'task', task: 'task-1', shared: true },
		{ id: 'shared-child', parent: 'integration', shared: true },
		{ id: 'unknown' },
		{ id: 'missing-user', resource: `draft-chat:${randomUUID()}` },
		{ id: 'invalid-user', resource: 'draft-chat:not-a-user' },
		{ id: 'late-conflict', checkpoint: `draft-chat:${ownerId}` },
		{ id: 'conflict', resource: `draft-chat:${ownerId}`, checkpoint: `draft-chat:${otherOwnerId}` },
		{ id: 'mixed', resource: `draft-chat:${ownerId}`, source: 'slack' },
		{ id: 'orphan', parent: 'missing-parent', resource: `draft-chat:${ownerId}` },
		{ id: 'mismatched-parent', parent: 'memory', parentAgentId: randomUUID() },
		{ id: 'cycle-a', parent: 'cycle-b' },
		{ id: 'cycle-b', parent: 'cycle-a' },
		{ id: 'a-batched-child', parent: 'z-batched-parent', expectedOwner: ownerId },
		{ id: 'z-batched-parent', resource: `draft-chat:${ownerId}`, expectedOwner: ownerId },
		...Array.from({ length: 225 }, (_, index) => ({
			id: `batch-${String(index).padStart(3, '0')}`,
			checkpoint: `draft-chat:${ownerId}`,
			expired: index % 2 === 0,
			expectedOwner: ownerId,
		})),
	];

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function expectNoStagingTable({ runQuery, tablePrefix, isSqlite }: TestMigrationContext) {
		const tables = await runQuery(
			isSqlite
				? 'SELECT name FROM sqlite_temp_master WHERE name = :name'
				: "SELECT tablename FROM pg_tables WHERE schemaname LIKE 'pg_temp_%' AND tablename = :name",
			{ name: `${tablePrefix}agent_thread_ownership_backfill` },
		);
		expect(tables).toEqual([]);
	}

	async function checkFailedBackfill() {
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_checkpoints')} RENAME TO ${escape.tableName('saved_checkpoints')}`,
			);
		});
		try {
			await expect(runSingleMigration(migrationName)).rejects.toThrow('agent_checkpoints');
		} finally {
			dataSource = Container.get(DataSource);
			await withContext(async ({ escape, runQuery }) => {
				await runQuery(
					`ALTER TABLE ${escape.tableName('saved_checkpoints')} RENAME TO ${escape.tableName('agent_checkpoints')}`,
				);
			});
		}
		await withContext(async (context) => {
			await expectNoStagingTable(context);
			const table = await context.queryRunner.getTable(
				`${context.tablePrefix}agent_execution_threads`,
			);
			expect(table?.columns.some((column) => column.name === 'ownerId')).toBe(false);
		});
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
		await withContext(async ({ escape, runQuery }) => {
			const t = escape.tableName;
			for (const id of [ownerId, otherOwnerId]) {
				await runQuery(`INSERT INTO ${t('user')} ("id") VALUES (:id)`, { id });
			}
			await runQuery(
				`INSERT INTO ${t('project')} ("id", "name", "type", "createdAt", "updatedAt") VALUES (:projectId, 'Project', 'team', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${t('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt") VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			for (const fixture of fixtures) {
				await runQuery(
					`INSERT INTO ${t('agent_execution_threads')} ("id", "agentId", "agentName", "projectId", "parentThreadId", "parentAgentId", "taskId", "createdAt", "updatedAt") VALUES (:id, :agentId, 'Agent', :projectId, :parent, :parentAgentId, :task, :now, :now)`,
					{
						id: fixture.id,
						agentId,
						projectId,
						parent: fixture.parent ?? null,
						parentAgentId: fixture.parentAgentId ?? (fixture.parent ? agentId : null),
						task: fixture.task ?? null,
						now,
					},
				);
				await runQuery(
					`INSERT INTO ${t('agent_execution')} ("id", "threadId", "status", "source", "createdAt", "updatedAt") VALUES (:id, :threadId, 'success', :source, :now, :now)`,
					{ id: randomUUID(), threadId: fixture.id, source: fixture.source ?? null, now },
				);
				if (fixture.resource) {
					await runQuery(
						`INSERT INTO ${t('agents_threads')} ("id", "resourceId") VALUES (:id, :resourceId)`,
						{ id: fixture.id, resourceId: fixture.resource },
					);
				}
				if (fixture.checkpoint) {
					await runQuery(
						`INSERT INTO ${t('agent_checkpoints')} ("runId", "agentId", "state", "expired") VALUES (:id, :agentId, :state, :expired)`,
						{
							id: `checkpoint-${fixture.id}`,
							agentId,
							expired: fixture.expired ?? false,
							state: JSON.stringify({
								status: 'suspended',
								persistence: { threadId: fixture.id, resourceId: fixture.checkpoint },
							}),
						},
					);
				}
			}
			await runQuery(
				`INSERT INTO ${t('agent_checkpoints')} ("runId", "agentId", "state") VALUES (:id, :agentId, :state)`,
				{
					id: 'zz-conflicting-checkpoint',
					agentId,
					state: JSON.stringify({
						persistence: { threadId: 'late-conflict', resourceId: `draft-chat:${otherOwnerId}` },
					}),
				},
			);
		});
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('sets access from retained state and preserves rows through rollback and reapplication', async () => {
		await checkFailedBackfill();
		await runSingleMigration(migrationName);
		dataSource = Container.get(DataSource);
		await withContext(expectNoStagingTable);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			const threads = await runQuery<
				Array<{ id: string; ownerId: string | null; accessScope: string }>
			>(
				`SELECT "id", "ownerId", "accessScope" FROM ${escape.tableName('agent_execution_threads')}`,
			);
			for (const fixture of fixtures) {
				expect(threads.find((thread) => thread.id === fixture.id)).toEqual({
					id: fixture.id,
					ownerId: fixture.expectedOwner ?? null,
					accessScope: fixture.shared ? 'project' : 'user',
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
			await runQuery(`DELETE FROM ${escape.tableName('user')} WHERE "id" = :ownerId`, { ownerId });
			expect(
				await runQuery(
					`SELECT "ownerId", "accessScope" FROM ${escape.tableName('agent_execution_threads')} WHERE "id" = 'memory'`,
				),
			).toEqual([{ ownerId: null, accessScope: 'user' }]);
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
		});
		await runSingleMigration(migrationName);
		dataSource = Container.get(DataSource);
		await withContext(expectNoStagingTable);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			expect(
				await runQuery(
					`SELECT "ownerId", "accessScope" FROM ${escape.tableName('agent_execution_threads')} WHERE "id" = 'memory'`,
				),
			).toEqual([{ ownerId: null, accessScope: 'user' }]);
			expect(
				await runQuery(`SELECT "threadId" FROM ${escape.tableName('agent_execution')}`),
			).toHaveLength(fixtures.length);
			const table = await queryRunner.getTable(`${tablePrefix}agent_execution_threads`);
			expect(table?.foreignKeys.filter((key) => key.columnNames.includes('ownerId'))).toHaveLength(
				1,
			);
		});
	});
});
