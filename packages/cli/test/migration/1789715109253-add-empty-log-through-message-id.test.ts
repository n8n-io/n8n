import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	testModules,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';

const MIGRATION_NAME = 'AddEmptyLogThroughMessageIdToAgentObservationCursors1789715109253';

describe('Empty observation log cursor migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('preserves legacy cursors through upgrade, adapter writes, downgrade, and re-upgrade', async () => {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const threadId = randomUUID();
		const resourceId = randomUUID();
		const messageId = randomUUID();
		const now = new Date('2026-09-18T07:00:00.000Z');
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
				 VALUES (:projectId, 'Test project', 'team', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
				 VALUES (:agentId, 'Test agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents_resources')} ("id", "createdAt", "updatedAt")
				 VALUES (:resourceId, :now, :now)`,
				{ resourceId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents_threads')} ("id", "resourceId", "createdAt", "updatedAt")
				 VALUES (:threadId, :resourceId, :now, :now)`,
				{ threadId, resourceId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents_observation_cursors')} ("agentId", "observationScopeId", "lastObservedMessageId", "lastObservedAt", "createdAt", "updatedAt")
				 VALUES (:agentId, :threadId, :messageId, :now, :now, :now)`,
				{ agentId, threadId, messageId, now },
			);
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		const memory = Container.get(N8nMemory).getImplementation(agentId);
		const legacyCursor = {
			observationScopeId: threadId,
			lastObservedMessageId: messageId,
			lastObservedAt: now,
			updatedAt: now,
		};
		expect(await memory.getCursor(threadId)).toEqual({
			...legacyCursor,
			emptyLogThroughMessageId: null,
		});

		const nextId = randomUUID();
		const nextCursor = { ...legacyCursor, lastObservedMessageId: nextId };
		await memory.setCursor({ ...nextCursor, emptyLogThroughMessageId: nextId });
		expect(await memory.getCursor(threadId)).toMatchObject({
			...nextCursor,
			emptyLogThroughMessageId: nextId,
		});
		await memory.setCursor(nextCursor);
		expect(await memory.getCursor(threadId)).toMatchObject({ emptyLogThroughMessageId: null });
		await memory.setCursor({ ...nextCursor, emptyLogThroughMessageId: nextId });

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		await withContext(async ({ escape, queryRunner, runQuery, tablePrefix }) => {
			expect(
				await queryRunner.hasColumn(
					`${tablePrefix}agents_observation_cursors`,
					'emptyLogThroughMessageId',
				),
			).toBe(false);
			expect(
				await runQuery(
					`SELECT "lastObservedMessageId" FROM ${escape.tableName('agents_observation_cursors')}`,
				),
			).toEqual([{ lastObservedMessageId: nextId }]);
		});
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		expect(await memory.getCursor(threadId)).toMatchObject({
			...nextCursor,
			emptyLogThroughMessageId: null,
		});
	});
});
