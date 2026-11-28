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
import { v7 as uuidv7 } from 'uuid';

const migrationName = 'CreateMcpServerTables1795765972133';
const tables = ['mcp_server', 'mcp_server_tool', 'mcp_server_connection', 'mcp_server_block'];

describe('CreateMcpServerTables migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(migrationName);
		await runSingleMigration(migrationName);
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		if (!context.queryRunner.isReleased) await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insert(table: string, row: Record<string, unknown>) {
		const { escape, runQuery } = context;
		const columns = Object.keys(row);
		await runQuery(
			`INSERT INTO ${escape.tableName(table)} (${columns.map(escape.columnName).join(', ')})
			 VALUES (${columns.map((column) => `:${column}`).join(', ')})`,
			row,
		);
	}

	async function count(table: string) {
		const { escape, runQuery } = context;
		const [row] = await runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS ${escape.columnName('count')} FROM ${escape.tableName(table)}`,
		);
		return Number(row.count);
	}

	async function insertProject() {
		const id = uuidv7();
		await insert('project', { id, name: 'Test project', type: 'team' });
		return id;
	}

	async function insertUser() {
		const id = uuidv7();
		await insert('user', {
			id,
			email: `${id}@example.com`,
			firstName: 'Test',
			lastName: 'User',
			password: 'password',
			roleSlug: 'global:member',
		});
		return id;
	}

	async function insertOAuthClient() {
		const id = uuidv7();
		await insert('oauth_clients', {
			id,
			name: 'Claude Code',
			redirectUris: '[]',
			grantTypes: '[]',
		});
		return id;
	}

	async function insertServer(projectId: string, slug: string, overrides = {}) {
		const id = uuidv7();
		await insert('mcp_server', { id, projectId, name: 'Sales tools', slug, ...overrides });
		return id;
	}

	async function insertTool(serverId: string, toolName: string, overrides = {}) {
		const id = uuidv7();
		await insert('mcp_server_tool', {
			id,
			serverId,
			kind: 'workflow',
			targetId: 'workflow-1',
			toolName,
			...overrides,
		});
		return id;
	}

	async function insertConnection(serverId: string, userId: string, oauthClientId: string) {
		await insert('mcp_server_connection', {
			serverId,
			userId,
			oauthClientId,
			clientName: 'Claude Code',
		});
	}

	async function insertBlock(serverId: string, userId: string) {
		await insert('mcp_server_block', { serverId, userId });
	}

	async function seedServerWithRows() {
		const projectId = await insertProject();
		const userId = await insertUser();
		const clientId = await insertOAuthClient();
		const serverId = await insertServer(projectId, 'sales-tools', { createdById: userId });
		await insertTool(serverId, 'get_pipeline_summary');
		await insertConnection(serverId, userId, clientId);
		await insertBlock(serverId, userId);
		return { projectId, userId, clientId, serverId };
	}

	it('keeps each slug unique on the instance, also for a deleted server', async () => {
		const projectId = await insertProject();
		const otherProjectId = await insertProject();
		await insertServer(projectId, 'sales-tools', { deletedAt: new Date() });

		await expect(insertServer(otherProjectId, 'sales-tools')).rejects.toThrow();
		await insertServer(otherProjectId, 'support-tools');
	});

	it('gives a new server an empty description', async () => {
		const serverId = await insertServer(await insertProject(), 'sales-tools');
		const { escape, runQuery } = context;

		const [server] = await runQuery<Array<{ description: string; deletedAt: Date | null }>>(
			`SELECT ${['description', 'deletedAt'].map(escape.columnName).join(', ')}
			 FROM ${escape.tableName('mcp_server')} WHERE ${escape.columnName('id')} = :id`,
			{ id: serverId },
		);

		expect(server).toEqual({ description: '', deletedAt: null });
	});

	it('keeps a tool name unique in its server only', async () => {
		const projectId = await insertProject();
		const serverId = await insertServer(projectId, 'sales-tools');
		const otherServerId = await insertServer(projectId, 'support-tools');
		await insertTool(serverId, 'get_pipeline_summary');

		await expect(insertTool(serverId, 'get_pipeline_summary')).rejects.toThrow();
		await insertTool(otherServerId, 'get_pipeline_summary');
	});

	it('accepts the four tool kinds and the three draft sources only', async () => {
		const serverId = await insertServer(await insertProject(), 'sales-tools');

		await insertTool(serverId, 'node_tool', { kind: 'node', targetId: null });
		await insertTool(serverId, 'agent_tool', { kind: 'agent', draftSource: 'ai' });
		await insertTool(serverId, 'skill_tool', { kind: 'skill', draftSource: 'edited' });
		await expect(insertTool(serverId, 'bad_kind', { kind: 'webhook' })).rejects.toThrow();
		await expect(insertTool(serverId, 'bad_source', { draftSource: 'user' })).rejects.toThrow();
	});

	it('keeps one connection row for each server, person, and OAuth client', async () => {
		const projectId = await insertProject();
		const serverId = await insertServer(projectId, 'sales-tools');
		const userId = await insertUser();
		const clientId = await insertOAuthClient();
		await insertConnection(serverId, userId, clientId);

		await expect(insertConnection(serverId, userId, clientId)).rejects.toThrow();
		await insertConnection(serverId, userId, await insertOAuthClient());
		await insertConnection(serverId, await insertUser(), clientId);
		expect(await count('mcp_server_connection')).toBe(3);
	});

	it('keeps one block row for each server and person', async () => {
		const serverId = await insertServer(await insertProject(), 'sales-tools');
		const userId = await insertUser();
		await insertBlock(serverId, userId);

		await expect(insertBlock(serverId, userId)).rejects.toThrow();
	});

	it('deletes the servers and their rows with their project', async () => {
		const { projectId } = await seedServerWithRows();
		const { escape, runQuery } = context;

		await runQuery(
			`DELETE FROM ${escape.tableName('project')} WHERE ${escape.columnName('id')} = :id`,
			{ id: projectId },
		);

		for (const table of tables) expect(await count(table)).toBe(0);
	});

	it('frees the slugs of a project when the project is deleted', async () => {
		const projectId = await insertProject();
		const otherProjectId = await insertProject();
		await insertServer(projectId, 'sales-tools', { deletedAt: new Date() });
		const { escape, runQuery } = context;

		await runQuery(
			`DELETE FROM ${escape.tableName('project')} WHERE ${escape.columnName('id')} = :id`,
			{ id: projectId },
		);

		await insertServer(otherProjectId, 'sales-tools');
		expect(await count('mcp_server')).toBe(1);
	});

	it('keeps the server and deletes the rows of a person when the person is deleted', async () => {
		const { userId } = await seedServerWithRows();
		const { escape, runQuery } = context;

		await runQuery(
			`DELETE FROM ${escape.tableName('user')} WHERE ${escape.columnName('id')} = :id`,
			{
				id: userId,
			},
		);

		expect(await count('mcp_server')).toBe(1);
		expect(await count('mcp_server_tool')).toBe(1);
		expect(await count('mcp_server_connection')).toBe(0);
		expect(await count('mcp_server_block')).toBe(0);
	});

	it('clears the creator and the blocker, and keeps the rows, when they are deleted', async () => {
		const projectId = await insertProject();
		const builderId = await insertUser();
		const serverId = await insertServer(projectId, 'sales-tools', { createdById: builderId });
		const blockedUserId = await insertUser();
		await insert('mcp_server_block', { serverId, userId: blockedUserId, blockedById: builderId });
		const { escape, runQuery } = context;

		await runQuery(
			`DELETE FROM ${escape.tableName('user')} WHERE ${escape.columnName('id')} = :id`,
			{
				id: builderId,
			},
		);

		const [server] = await runQuery<Array<{ createdById: string | null }>>(
			`SELECT ${escape.columnName('createdById')} FROM ${escape.tableName('mcp_server')}`,
		);
		const [block] = await runQuery<Array<{ blockedById: string | null }>>(
			`SELECT ${escape.columnName('blockedById')} FROM ${escape.tableName('mcp_server_block')}`,
		);
		expect(server.createdById).toBeNull();
		expect(block.blockedById).toBeNull();
	});

	it('deletes the connections of an OAuth client with the client', async () => {
		const { clientId } = await seedServerWithRows();
		const { escape, runQuery } = context;

		await runQuery(
			`DELETE FROM ${escape.tableName('oauth_clients')} WHERE ${escape.columnName('id')} = :id`,
			{ id: clientId },
		);

		expect(await count('mcp_server_connection')).toBe(0);
		expect(await count('mcp_server_block')).toBe(1);
	});

	it('reverts populated tables and can run again', async () => {
		await seedServerWithRows();
		await context.queryRunner.release();

		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);
		for (const table of tables) {
			expect(await context.queryRunner.hasTable(`${context.tablePrefix}${table}`)).toBe(false);
		}
		await context.queryRunner.release();

		await runSingleMigration(migrationName);
		context = createTestMigrationContext(dataSource);
		await seedServerWithRows();
	});
});
