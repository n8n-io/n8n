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
import { v7 as uuid } from 'uuid';

const migration = 'AddAgentApprovalJobKind1793026533805';

describe('Agent approval job migration', () => {
	async function context<T>(run: (ctx: TestMigrationContext) => Promise<T>) {
		const ctx = createTestMigrationContext(Container.get(DataSource));
		try {
			return await run(ctx);
		} finally {
			await ctx.queryRunner.release();
		}
	}
	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await context(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
	});
	afterAll(async () => await Container.get(DbConnection).close());

	it('preserves normal jobs and archives approval jobs on downgrade', async () => {
		const agentId = uuid();
		const projectId = uuid();
		const normalId = uuid();
		const approvalId = uuid();
		const now = new Date();
		await context(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} (${['id', 'name', 'type', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:projectId, 'Project', 'personal', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')} (${['id', 'name', 'projectId', 'integrations', 'tools', 'skills', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_background_job')} (${['id', 'kind', 'status', 'parentAgentId', 'parentThreadId', 'parentResourceId', 'parentPrincipalHash', 'title', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:normalId, 'workflow', 'running', :agentId, 'thread', 'resource', 'principal', 'Work', :now, :now)`,
				{ normalId, agentId, now },
			);
		});
		await runSingleMigration(migration);
		await context(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_background_job')} (${['id', 'kind', 'status', 'parentAgentId', 'parentThreadId', 'parentResourceId', 'parentPrincipalHash', 'parentRunId', 'title', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:approvalId, 'approval', 'running', :agentId, 'thread', 'resource', 'principal', 'run', 'Review', :now, :now)`,
				{ approvalId, agentId, now },
			);
		});
		await undoLastSingleMigration();
		await context(async ({ escape, runQuery }) => {
			const rows = await runQuery<
				{ id: string; kind: string; status: string; notifiedAt: unknown }[]
			>(
				`SELECT ${['id', 'kind', 'status', 'notifiedAt'].map(escape.columnName).join(', ')} FROM ${escape.tableName('agent_background_job')}`,
			);
			expect(rows.find(({ id }) => id === normalId)).toMatchObject({
				kind: 'workflow',
				status: 'running',
				notifiedAt: null,
			});
			expect(rows.find(({ id }) => id === approvalId)).toMatchObject({
				kind: 'workflow',
				status: 'cancelled',
				notifiedAt: expect.anything(),
			});
		});
		await runSingleMigration(migration);
	});
});
