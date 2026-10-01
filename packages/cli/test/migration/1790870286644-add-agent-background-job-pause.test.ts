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

const MIGRATION_NAME = 'AddAgentBackgroundJobPause1790870286644';

describe('AddAgentBackgroundJobPause migration', () => {
	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('preserves existing jobs and settles paused jobs on rollback', async () => {
		const agentId = randomUUID();
		const projectId = randomUUID();
		const runningId = randomUUID();
		const pausedId = randomUUID();
		const now = new Date();
		const pauseRequestId = randomUUID();
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
				 VALUES (:projectId, 'Project', 'personal', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')}
				 ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
				 VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			for (const id of [runningId, pausedId]) {
				await runQuery(
					`INSERT INTO ${escape.tableName('agent_background_job')}
					 ("id", "kind", "status", "parentAgentId", "parentThreadId", "parentResourceId", "parentPrincipalHash", "title", "subAgentId", "childThreadId", "createdAt", "updatedAt")
					 VALUES (:id, 'subagent', 'running', :agentId, 'parent', :resourceId, 'principal', 'Research', :agentId, :id, :now, :now)`,
					{ id, agentId, now, resourceId: 'draft-chat:user-1' },
				);
			}
		});

		await runSingleMigration(MIGRATION_NAME);
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			await runQuery(
				`UPDATE ${escape.tableName('agent_background_job')} SET "status" = 'paused', "pauseRequestId" = :pauseRequestId, "notifiedAt" = :now WHERE "id" = :pausedId`,
				{ pausedId, now, pauseRequestId },
			);
			const rows = await runQuery<
				Array<{ id: string; status: string; pauseRequestId: string | null }>
			>(`SELECT "id", "status", "pauseRequestId" FROM ${escape.tableName('agent_background_job')}`);
			expect(rows).toEqual(
				expect.arrayContaining([
					{ id: runningId, status: 'running', pauseRequestId: null },
					{ id: pausedId, status: 'paused', pauseRequestId },
				]),
			);
			const table = await queryRunner.getTable(`${tablePrefix}agent_background_job`);
			expect(table?.indices).toContainEqual(
				expect.objectContaining({
					columnNames: ['childExecutionId'],
					isUnique: true,
				}),
			);
			await expect(
				runQuery(
					`UPDATE ${escape.tableName('agent_background_job')} SET "status" = 'unknown' WHERE "id" = :pausedId`,
					{ pausedId },
				),
			).rejects.toThrow();
		});

		await undoLastSingleMigration();
		await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<
				Array<{
					id: string;
					status: string;
					error: string | null;
					notifiedAt: Date | null;
					settledAt: Date | null;
				}>
			>(
				`SELECT "id", "status", "error", "notifiedAt", "settledAt" FROM ${escape.tableName('agent_background_job')}`,
			);
			expect(rows.find(({ id }) => id === runningId)).toMatchObject({
				status: 'running',
				error: null,
				settledAt: null,
			});
			expect(rows.find(({ id }) => id === pausedId)).toMatchObject({
				status: 'failed',
				error: 'Background pause is unavailable after this downgrade',
				notifiedAt: null,
				settledAt: expect.anything(),
			});
			await expect(
				runQuery(
					`UPDATE ${escape.tableName('agent_background_job')} SET "status" = 'paused' WHERE "id" = :pausedId`,
					{ pausedId },
				),
			).rejects.toThrow();
		});
	});
});
