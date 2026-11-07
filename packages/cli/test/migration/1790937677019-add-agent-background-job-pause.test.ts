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

const MIGRATION_NAME = 'AddAgentBackgroundJobPause1790937677019';

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

	it('preserves jobs and blocks rollback until paused jobs are settled', async () => {
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

		await expect(undoLastSingleMigration()).rejects.toThrow(
			'Cannot revert background job pause support while paused jobs exist.',
		);
		await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<
				Array<{
					id: string;
					status: string;
					pauseRequestId: string | null;
					error: string | null;
					notifiedAt: Date | null;
					settledAt: Date | null;
				}>
			>(
				`SELECT ${escape.columnName('id')}, ${escape.columnName('status')}, ${escape.columnName('pauseRequestId')},
				 ${escape.columnName('error')}, ${escape.columnName('notifiedAt')}, ${escape.columnName('settledAt')}
				 FROM ${escape.tableName('agent_background_job')}`,
			);
			expect(rows.find(({ id }) => id === runningId)).toMatchObject({
				status: 'running',
				pauseRequestId: null,
				error: null,
				notifiedAt: null,
				settledAt: null,
			});
			expect(rows.find(({ id }) => id === pausedId)).toMatchObject({
				status: 'paused',
				pauseRequestId,
				error: null,
				notifiedAt: expect.anything(),
				settledAt: null,
			});
			await runQuery(
				`UPDATE ${escape.tableName('agent_background_job')}
				 SET ${escape.columnName('status')} = 'completed', ${escape.columnName('settledAt')} = :now
				 WHERE ${escape.columnName('id')} = :pausedId`,
				{ pausedId, now },
			);
		});

		await undoLastSingleMigration();
		await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
			expect(
				await queryRunner.hasColumn(`${tablePrefix}agent_background_job`, 'pauseRequestId'),
			).toBe(false);
			const rows = await runQuery<Array<{ id: string; status: string }>>(
				`SELECT ${escape.columnName('id')}, ${escape.columnName('status')}
				 FROM ${escape.tableName('agent_background_job')}`,
			);
			expect(rows).toEqual(
				expect.arrayContaining([
					{ id: runningId, status: 'running' },
					{ id: pausedId, status: 'completed' },
				]),
			);
			await expect(
				runQuery(
					`UPDATE ${escape.tableName('agent_background_job')} SET "status" = 'paused' WHERE "id" = :pausedId`,
					{ pausedId },
				),
			).rejects.toThrow();
		});
	});
});
