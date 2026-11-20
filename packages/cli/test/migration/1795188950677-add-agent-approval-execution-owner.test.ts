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

const migration = 'AddAgentApprovalExecutionOwner1795188950677';

describe('Agent approval execution owner migration', () => {
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

	it('adds and removes private execution ownership without changing Agent definitions', async () => {
		const agentId = uuid();
		const identityId = uuid();
		const projectId = uuid();
		const jobIds = [uuid(), uuid()];
		const now = new Date();
		await context(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('user')} (${['id', 'kind', 'roleSlug'].map(escape.columnName).join(', ')}) VALUES (:identityId, 'service', :roleSlug)`,
				{ identityId, roleSlug: 'global:agent' },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} (${['id', 'name', 'type', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:projectId, 'Project', 'personal', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')} (${['id', 'name', 'projectId', 'identityId', 'integrations', 'tools', 'skills', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:agentId, 'Agent', :projectId, :identityId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, identityId, projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_background_job')} (${['id', 'kind', 'status', 'parentAgentId', 'parentThreadId', 'parentResourceId', 'parentPrincipalHash', 'title', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:jobId, 'workflow', 'running', :agentId, 'thread', 'resource', 'principal', 'Work', :now, :now)`,
				{ jobId: jobIds[0], agentId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_background_job')} (${['id', 'kind', 'status', 'parentAgentId', 'parentThreadId', 'parentResourceId', 'parentPrincipalHash', 'parentRunId', 'title', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:jobId, 'approval', 'running', :agentId, 'thread', 'resource', 'principal', 'run', 'Review', :now, :now)`,
				{ jobId: jobIds[1], agentId, now },
			);
		});

		async function readState() {
			return await context(async ({ escape, runQuery }) => ({
				agents: await runQuery<Array<{ name: string }>>(
					`SELECT ${escape.columnName('name')} FROM ${escape.tableName('agents')} WHERE ${escape.columnName('id')} = :agentId`,
					{ agentId },
				),
				jobs: await runQuery<Array<{ id: string }>>(
					`SELECT ${escape.columnName('id')} FROM ${escape.tableName('agent_background_job')} WHERE ${escape.columnName('parentAgentId')} = :agentId`,
					{ agentId },
				),
			}));
		}

		await runSingleMigration(migration);
		expect((await readState()).jobs).toHaveLength(2);
		await context(async ({ escape, runQuery }) => {
			const workflowId = uuid();
			await runQuery(
				`INSERT INTO ${escape.tableName('workflow_entity')} (${['id', 'name', 'nodes', 'connections', 'versionId', 'active', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')}) VALUES (:workflowId, 'Private execution owner', '[]', '{}', :versionId, :active, :now, :now)`,
				{ workflowId, versionId: uuid(), active: false, now },
			);
			await runQuery(
				`UPDATE ${escape.tableName('agents')} SET ${escape.columnName('approvalWorkflowId')} = :workflowId WHERE ${escape.columnName('id')} = :agentId`,
				{ workflowId, agentId },
			);
			await expect(
				runQuery(
					`DELETE FROM ${escape.tableName('workflow_entity')} WHERE ${escape.columnName('id')} = :workflowId`,
					{ workflowId },
				),
			).rejects.toThrow();
		});

		await undoLastSingleMigration();
		const afterDowngrade = await readState();
		expect(afterDowngrade.agents).toEqual([{ name: 'Agent' }]);
		expect(afterDowngrade.jobs.map(({ id }) => id).sort()).toEqual([...jobIds].sort());
		await runSingleMigration(migration);
	});
});
