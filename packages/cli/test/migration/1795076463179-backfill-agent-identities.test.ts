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

const MIGRATION_NAME = 'BackfillAgentIdentities1795076463179';

type AgentRow = { id: string; identityId: string | null };

describe('BackfillAgentIdentities migration', () => {
	let dataSource: DataSource;
	const projectId = randomUUID();
	const projectAgentId = randomUUID();
	const blankNameAgentId = randomUUID();
	const instanceAgentId = randomUUID();
	const linkedAgentId = randomUUID();
	const existingIdentityId = randomUUID();
	const linkedInstanceAgentId = randomUUID();
	const existingInstanceIdentityId = randomUUID();
	const versionId = randomUUID();

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	const query = async <T>(sql: string, params?: Record<string, unknown>) =>
		await withContext(async (ctx) => {
			const resolved = sql.replace(/\{(\w+)\}/g, (_, table: string) => ctx.escape.tableName(table));
			return await ctx.runQuery<T>(resolved, params);
		});

	const getAgents = async () =>
		await query<AgentRow[]>('SELECT "id", "identityId" FROM {agents} ORDER BY "id"');

	const countServiceAccounts = async () =>
		(await query<unknown[]>('SELECT 1 FROM {user} WHERE "kind" = \'service\'')).length;

	const getAgentsTable = async () =>
		await withContext(async (ctx) => await ctx.queryRunner.getTable(`${ctx.tablePrefix}agents`));

	const getIdentityForeignKey = async () =>
		(await getAgentsTable())?.foreignKeys.find((fk) => fk.columnNames.includes('identityId'));

	const hasUniqueIdentityIndex = async () =>
		(await getAgentsTable())?.indices.some(
			(index) => index.isUnique && index.columnNames.includes('identityId'),
		);

	const getIdentityId = async (agentId: string) =>
		(await getAgents()).find((agent) => agent.id === agentId)?.identityId;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async (ctx) => await ctx.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);

		const now = new Date();
		await query(
			'INSERT INTO {project} ("id", "name", "type", "createdAt", "updatedAt") VALUES (:projectId, \'Project\', \'team\', :now, :now)',
			{ projectId, now },
		);
		for (const [id, name] of [
			[projectAgentId, 'Support agent'],
			[blankNameAgentId, ' '],
		]) {
			await query(
				'INSERT INTO {agents} ("id", "name", "projectId", "integrations", "tools", "skills") VALUES (:id, :name, :projectId, \'[]\', \'{}\', \'{}\')',
				{ id, name, projectId },
			);
		}
		await query(
			'INSERT INTO {agents} ("id", "name", "projectId", "scope", "integrations", "tools", "skills") VALUES (:id, \'Assistant\', NULL, \'instance\', \'[]\', \'{}\', \'{}\')',
			{ id: instanceAgentId },
		);
		await query('INSERT INTO {user} ("id", "kind") VALUES (:id, \'service\')', {
			id: existingIdentityId,
		});
		await query(
			'INSERT INTO {agents} ("id", "name", "projectId", "identityId", "integrations", "tools", "skills") VALUES (:id, \'Linked agent\', :projectId, :identityId, \'[]\', \'{}\', \'{}\')',
			{ id: linkedAgentId, projectId, identityId: existingIdentityId },
		);
		// An instance agent that got its identity when it registered on start.
		await query('INSERT INTO {user} ("id", "kind") VALUES (:id, \'service\')', {
			id: existingInstanceIdentityId,
		});
		await query(
			'INSERT INTO {agents} ("id", "name", "projectId", "scope", "identityId", "integrations", "tools", "skills") VALUES (:id, \'Linked assistant\', NULL, \'instance\', :identityId, \'[]\', \'{}\', \'{}\')',
			{ id: linkedInstanceAgentId, identityId: existingInstanceIdentityId },
		);
		// A row with a CASCADE FK to `agents`: recreating `agents` on SQLite must keep it.
		await query(
			'INSERT INTO {agent_history} ("versionId", "agentId", "author", "createdAt", "updatedAt") VALUES (:versionId, :agentId, \'Author\', :now, :now)',
			{ versionId, agentId: projectAgentId, now },
		);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('gives each agent without an identity one service account with a personal project', async () => {
		await runSingleMigration(MIGRATION_NAME);

		expect(await countServiceAccounts()).toBe(5);
		expect((await query<unknown[]>('SELECT 1 FROM {agent_history}')).length).toBe(1);

		for (const [agentId, name] of [
			[projectAgentId, 'Support agent'],
			[blankNameAgentId, 'Agent'],
			[instanceAgentId, 'Assistant'],
		]) {
			const identityId = await getIdentityId(agentId);
			expect(identityId).toEqual(expect.any(String));

			const [account] = await query<Array<{ kind: string; roleSlug: string; name: string }>>(
				'SELECT u."kind", u."roleSlug", d."name" FROM {user} u JOIN {service_account_details} d ON d."userId" = u."id" WHERE u."id" = :identityId',
				{ identityId },
			);
			expect(account).toEqual({ kind: 'service', roleSlug: 'global:agent', name });

			const projects = await query<Array<{ name: string; type: string; role: string }>>(
				'SELECT p."name", p."type", pr."role" FROM {project} p JOIN {project_relation} pr ON pr."projectId" = p."id" WHERE p."creatorId" = :identityId AND pr."userId" = :identityId',
				{ identityId },
			);
			expect(projects).toEqual([{ name, type: 'personal', role: 'project:personalOwner' }]);
		}
	});

	it('keeps the identity of an agent that already has one', async () => {
		expect(await getIdentityId(linkedAgentId)).toBe(existingIdentityId);
	});

	it('gives an instance agent with an identity no second service account', async () => {
		expect(await getIdentityId(linkedInstanceAgentId)).toBe(existingInstanceIdentityId);
	});

	it('gives each agent a different identity', async () => {
		const identityIds = (await getAgents()).map((agent) => agent.identityId);
		expect(new Set(identityIds).size).toBe(identityIds.length);
	});

	it('rejects an agent without identityId', async () => {
		await expect(
			query(
				'INSERT INTO {agents} ("id", "name", "projectId", "integrations", "tools", "skills") VALUES (:id, \'No identity\', :projectId, \'[]\', \'{}\', \'{}\')',
				{ id: randomUUID(), projectId },
			),
		).rejects.toThrow();
	});

	it('rejects a second agent with an identity that is in use', async () => {
		expect(await hasUniqueIdentityIndex()).toBe(true);
		await expect(
			query(
				'INSERT INTO {agents} ("id", "name", "projectId", "identityId", "integrations", "tools", "skills") VALUES (:id, \'Copy\', :projectId, :identityId, \'[]\', \'{}\', \'{}\')',
				{ id: randomUUID(), projectId, identityId: existingIdentityId },
			),
		).rejects.toThrow();
	});

	it('rejects the delete of an identity while its agent exists', async () => {
		expect(await getIdentityForeignKey()).toMatchObject({ onDelete: 'RESTRICT' });
		await expect(
			query('DELETE FROM {user} WHERE "id" = :id', { id: existingIdentityId }),
		).rejects.toThrow();
		expect(await getIdentityId(linkedAgentId)).toBe(existingIdentityId);
	});

	it('makes identityId nullable with SET NULL again on rollback and keeps the service accounts', async () => {
		await undoLastSingleMigration();

		const table = await getAgentsTable();
		expect(table?.findColumnByName('identityId')).toMatchObject({ isNullable: true });
		expect(await getIdentityForeignKey()).toMatchObject({ onDelete: 'SET NULL' });
		expect(await hasUniqueIdentityIndex()).toBe(true);
		expect(await countServiceAccounts()).toBe(5);
		expect((await query<unknown[]>('SELECT 1 FROM {agent_history}')).length).toBe(1);
	});

	it('creates no new account when it runs again', async () => {
		const before = await getAgents();

		await runSingleMigration(MIGRATION_NAME);

		expect(await countServiceAccounts()).toBe(5);
		expect(await getAgents()).toEqual(before);
	});

	it('gives every agent an account when there are more agents than one batch', async () => {
		await undoLastSingleMigration();
		// The migration selects 500 agents in each batch.
		const count = 501;
		for (let i = 0; i < count; i++) {
			await query(
				'INSERT INTO {agents} ("id", "name", "projectId", "integrations", "tools", "skills") VALUES (:id, \'Batch agent\', :projectId, \'[]\', \'{}\', \'{}\')',
				{ id: randomUUID(), projectId },
			);
		}

		await runSingleMigration(MIGRATION_NAME);

		const identityIds = (await getAgents()).map((agent) => agent.identityId);
		expect(identityIds).not.toContain(null);
		expect(new Set(identityIds).size).toBe(identityIds.length);
		expect(await countServiceAccounts()).toBe(5 + count);
	});
});
