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

const MIGRATION_NAME = 'AddSuspendedAgentBackgroundJobStatus1790277419519';

describe('AddSuspendedAgentBackgroundJobStatus migration', () => {
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

	it('preserves existing jobs and settles waiting approvals on rollback', async () => {
		const agentId = randomUUID();
		const projectId = randomUUID();
		const runningId = randomUUID();
		const waitingId = randomUUID();
		const now = new Date();
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
			for (const id of [runningId, waitingId]) {
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
				`UPDATE ${escape.tableName('agent_background_job')} SET "status" = 'suspended', "notifiedAt" = :now WHERE "id" = :waitingId`,
				{ waitingId, now },
			);
			const rows = await runQuery<Array<{ id: string; status: string }>>(
				`SELECT "id", "status" FROM ${escape.tableName('agent_background_job')}`,
			);
			expect(rows).toEqual(
				expect.arrayContaining([
					{ id: runningId, status: 'running' },
					{ id: waitingId, status: 'suspended' },
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
					`UPDATE ${escape.tableName('agent_background_job')} SET "status" = 'unknown' WHERE "id" = :waitingId`,
					{ waitingId },
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
			expect(rows.find(({ id }) => id === waitingId)).toMatchObject({
				status: 'failed',
				error: 'Background approval is unavailable after this downgrade',
				notifiedAt: null,
				settledAt: expect.anything(),
			});
			await expect(
				runQuery(
					`UPDATE ${escape.tableName('agent_background_job')} SET "status" = 'suspended' WHERE "id" = :waitingId`,
					{ waitingId },
				),
			).rejects.toThrow();
		});
	});
});
