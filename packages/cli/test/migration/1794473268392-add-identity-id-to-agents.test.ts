import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddIdentityIdToAgents1794473268392';

describe('AddIdentityIdToAgents migration', () => {
	let dataSource: DataSource;
	const projectId = randomUUID();
	const agentId = randomUUID();
	const otherAgentId = randomUUID();
	const versionId = randomUUID();
	const identityId = randomUUID();

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	const getAgentsTable = async () =>
		await withContext(async (ctx) => await ctx.queryRunner.getTable(`${ctx.tablePrefix}agents`));

	const countRows = async (table: string) =>
		await withContext(async (ctx) => {
			const rows = await ctx.runQuery<unknown[]>(`SELECT 1 FROM ${ctx.escape.tableName(table)}`);
			return rows.length;
		});

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async (ctx) => await ctx.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);

		await withContext(async ({ escape, runQuery }) => {
			const now = new Date();
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt") VALUES (:projectId, 'Project', 'team', :now, :now)`,
				{ projectId, now },
			);
			for (const id of [agentId, otherAgentId]) {
				await runQuery(
					`INSERT INTO ${escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills") VALUES (:id, 'Agent', :projectId, '[]', '{}', '{}')`,
					{ id, projectId },
				);
			}
			// A row with a CASCADE FK to `agents`: recreating `agents` on SQLite must keep it.
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_history')} ("versionId", "agentId", "author", "createdAt", "updatedAt") VALUES (:versionId, :agentId, 'Author', :now, :now)`,
				{ versionId, agentId, now },
			);
			await runQuery(`INSERT INTO ${escape.tableName('user')} ("id") VALUES (:identityId)`, {
				identityId,
			});
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('adds a nullable identityId and keeps the agents and their history', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const table = await getAgentsTable();
		expect(table?.findColumnByName('identityId')).toMatchObject({ isNullable: true });
		expect(await countRows('agents')).toBe(2);
		expect(await countRows('agent_history')).toBe(1);
	});

	it('allows one agent for each identity', async () => {
		await withContext(async ({ escape, runQuery }) => {
			const agents = escape.tableName('agents');
			await runQuery(`UPDATE ${agents} SET "identityId" = :identityId WHERE "id" = :agentId`, {
				identityId,
				agentId,
			});

			await expect(
				runQuery(`UPDATE ${agents} SET "identityId" = :identityId WHERE "id" = :otherAgentId`, {
					identityId,
					otherAgentId,
				}),
			).rejects.toThrow();
		});
	});

	it('clears identityId and keeps the agent when the identity is deleted', async () => {
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(`DELETE FROM ${escape.tableName('user')} WHERE "id" = :identityId`, {
				identityId,
			});

			const rows = await runQuery<Array<{ identityId: string | null }>>(
				`SELECT "identityId" FROM ${escape.tableName('agents')} WHERE "id" = :agentId`,
				{ agentId },
			);
			expect(rows).toEqual([{ identityId: null }]);
		});
	});

	it('removes identityId on rollback and keeps the agents and their history', async () => {
		await undoLastSingleMigration();

		const table = await getAgentsTable();
		expect(table?.findColumnByName('identityId')).toBeUndefined();
		expect(await countRows('agents')).toBe(2);
		expect(await countRows('agent_history')).toBe(1);
	});

	it('runs again after a rollback', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const table = await getAgentsTable();
		expect(table?.findColumnByName('identityId')).toBeDefined();
	});
});
