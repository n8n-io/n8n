import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateChatHubToolsTable1770000000000';

function makeTool(
	overrides: Partial<{ id: string; name: string; type: string; typeVersion: number }> = {},
) {
	return {
		id: overrides.id ?? randomUUID(),
		name: overrides.name ?? 'Google Search',
		type: overrides.type ?? '@n8n/n8n-nodes-langchain.toolSerpApi',
		typeVersion: overrides.typeVersion ?? 1,
		parameters: { query: 'test' },
		position: [0, 0],
	};
}

describe('CreateChatHubToolsTable Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertUser(context: TestMigrationContext, id: string): Promise<void> {
		const tableName = context.escape.tableName('user');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt") VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id,
				email: `${id}@test.com`,
				firstName: 'Test',
				lastName: 'User',
				password: 'hashed',
				roleSlug: 'global:member',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertSession(
		context: TestMigrationContext,
		data: { id: string; ownerId: string; tools: object[] },
	): Promise<void> {
		const tableName = context.escape.tableName('chat_hub_sessions');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "title", "ownerId", "tools", "lastMessageAt", "createdAt", "updatedAt") VALUES (:id, :title, :ownerId, :tools, :lastMessageAt, :createdAt, :updatedAt)`,
			{
				id: data.id,
				title: 'Test Session',
				ownerId: data.ownerId,
				tools: JSON.stringify(data.tools),
				lastMessageAt: now,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertAgent(
		context: TestMigrationContext,
		data: { id: string; ownerId: string; tools: object[] },
	): Promise<void> {
		const tableName = context.escape.tableName('chat_hub_agents');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "name", "systemPrompt", "ownerId", "provider", "model", "tools", "createdAt", "updatedAt") VALUES (:id, :name, :systemPrompt, :ownerId, :provider, :model, :tools, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: 'Test Agent',
				systemPrompt: 'You are helpful',
				ownerId: data.ownerId,
				provider: 'openai',
				model: 'gpt-4',
				tools: JSON.stringify(data.tools),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	describe('Up Migration', () => {
		const userId1 = randomUUID();
		const userId2 = randomUUID();
		const sessionWithTools = randomUUID();
		const sessionWithEmptyTools = randomUUID();
		const sessionWithDuplicateTools = randomUUID();
		const sessionWithInvalidTool = randomUUID();
		const agentWithTools = randomUUID();
		const agentSharingToolWithSession = randomUUID();

		const tool1 = makeTool({ name: 'Google Search' });
		const tool2 = makeTool({ name: 'Wikipedia' });

		beforeAll(async () => {
			const context = createTestMigrationContext(dataSource);

			await insertUser(context, userId1);
			await insertUser(context, userId2);

			// Session with two valid tools
			await insertSession(context, {
				id: sessionWithTools,
				ownerId: userId1,
				tools: [tool1, tool2],
			});

			// Session with empty tools array (should be excluded by WHERE clause)
			await insertSession(context, {
				id: sessionWithEmptyTools,
				ownerId: userId1,
				tools: [],
			});

			// Session with the same tool name appearing twice (somehow) — should deduplicate
			await insertSession(context, {
				id: sessionWithDuplicateTools,
				ownerId: userId1,
				tools: [tool1, { ...tool1, id: randomUUID() }],
			});

			// Session with a tool missing required fields — should be skipped
			await insertSession(context, {
				id: sessionWithInvalidTool,
				ownerId: userId1,
				tools: [{ id: randomUUID(), name: 'Bad Tool' }], // missing type & typeVersion
			});

			// Agent with one tool
			await insertAgent(context, {
				id: agentWithTools,
				ownerId: userId1,
				tools: [tool2],
			});

			// Agent for a different user with same tool name — should create separate tool row
			await insertAgent(context, {
				id: agentSharingToolWithSession,
				ownerId: userId2,
				tools: [makeTool({ name: 'Google Search' })],
			});

			await runSingleMigration(MIGRATION_NAME);
			await context.queryRunner.release();
		});

		it('should create chat_hub_tools table', async () => {
			const context = createTestMigrationContext(dataSource);
			const toolsTable = context.escape.tableName('chat_hub_tools');
			const rows = await context.runQuery<unknown[]>(`SELECT * FROM ${toolsTable}`);
			expect(rows.length).toBeGreaterThan(0);
			await context.queryRunner.release();
		});

		it('should migrate session tools to chat_hub_tools and create join table entries', async () => {
			const context = createTestMigrationContext(dataSource);
			const sessionToolsTable = context.escape.tableName('chat_hub_session_tools');
			const rows = await context.runQuery<Array<{ sessionId: string; toolId: string }>>(
				`SELECT "sessionId", "toolId" FROM ${sessionToolsTable} WHERE "sessionId" = :sessionId`,
				{ sessionId: sessionWithTools },
			);
			// Should have 2 tools linked
			expect(rows).toHaveLength(2);
			await context.queryRunner.release();
		});

		it('should deduplicate tools with the same name across sessions for the same user', async () => {
			const context = createTestMigrationContext(dataSource);
			const toolsTable = context.escape.tableName('chat_hub_tools');
			const sessionToolsTable = context.escape.tableName('chat_hub_session_tools');

			// Only one tool row should exist for (userId1, "Google Search")
			const toolRows = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${toolsTable} WHERE "ownerId" = :ownerId AND "name" = :name`,
				{ ownerId: userId1, name: 'Google Search' },
			);
			expect(toolRows).toHaveLength(1);
			const sharedToolId = toolRows[0].id;

			// Both sessionWithTools and sessionWithDuplicateTools have "Google Search"
			// with different original IDs, but both should reference the same tool row
			const session1Links = await context.runQuery<Array<{ toolId: string }>>(
				`SELECT "toolId" FROM ${sessionToolsTable} WHERE "sessionId" = :sessionId AND "toolId" = :toolId`,
				{ sessionId: sessionWithTools, toolId: sharedToolId },
			);
			expect(session1Links).toHaveLength(1);

			const session2Links = await context.runQuery<Array<{ toolId: string }>>(
				`SELECT "toolId" FROM ${sessionToolsTable} WHERE "sessionId" = :sessionId AND "toolId" = :toolId`,
				{ sessionId: sessionWithDuplicateTools, toolId: sharedToolId },
			);
			expect(session2Links).toHaveLength(1);

			await context.queryRunner.release();
		});

		it('should create separate tool rows for different users with the same tool name', async () => {
			const context = createTestMigrationContext(dataSource);
			const toolsTable = context.escape.tableName('chat_hub_tools');
			const rows = await context.runQuery<Array<{ ownerId: string }>>(
				`SELECT "ownerId" FROM ${toolsTable} WHERE "name" = :name`,
				{ name: 'Google Search' },
			);
			// Two different users each get their own tool row
			expect(rows).toHaveLength(2);
			await context.queryRunner.release();
		});

		it('should reuse the same tool row across sessions and agents for the same user', async () => {
			const context = createTestMigrationContext(dataSource);
			const sessionToolsTable = context.escape.tableName('chat_hub_session_tools');
			const agentToolsTable = context.escape.tableName('chat_hub_agent_tools');

			// Get all toolIds linked to sessionWithTools (has both "Google Search" and "Wikipedia")
			const sessionRows = await context.runQuery<Array<{ toolId: string }>>(
				`SELECT "toolId" FROM ${sessionToolsTable} WHERE "sessionId" = :sessionId`,
				{ sessionId: sessionWithTools },
			);

			// Get toolId linked to agentWithTools (has only "Wikipedia")
			const agentRows = await context.runQuery<Array<{ toolId: string }>>(
				`SELECT "toolId" FROM ${agentToolsTable} WHERE "agentId" = :agentId`,
				{ agentId: agentWithTools },
			);

			// The agent's "Wikipedia" toolId should match one of the session's toolIds
			const sessionToolIds = new Set(sessionRows.map((r) => r.toolId));
			const agentToolId = agentRows[0].toolId;
			expect(sessionToolIds.has(agentToolId)).toBe(true);

			await context.queryRunner.release();
		});

		it('should skip tools with missing required fields', async () => {
			const context = createTestMigrationContext(dataSource);
			const sessionToolsTable = context.escape.tableName('chat_hub_session_tools');
			const rows = await context.runQuery<Array<{ toolId: string }>>(
				`SELECT "toolId" FROM ${sessionToolsTable} WHERE "sessionId" = :sessionId`,
				{ sessionId: sessionWithInvalidTool },
			);
			// The invalid tool should have been skipped
			expect(rows).toHaveLength(0);
			await context.queryRunner.release();
		});

		it('should handle duplicate tools within a single session', async () => {
			const context = createTestMigrationContext(dataSource);
			const sessionToolsTable = context.escape.tableName('chat_hub_session_tools');
			const rows = await context.runQuery<Array<{ toolId: string }>>(
				`SELECT "toolId" FROM ${sessionToolsTable} WHERE "sessionId" = :sessionId`,
				{ sessionId: sessionWithDuplicateTools },
			);
			// Duplicate name → only one join entry
			expect(rows).toHaveLength(1);
			await context.queryRunner.release();
		});

		it('should store full tool definition in the definition column', async () => {
			const context = createTestMigrationContext(dataSource);
			const toolsTable = context.escape.tableName('chat_hub_tools');

			const definitionColumn = context.isPostgres ? '"definition"::text' : '"definition"';
			const rows = await context.runQuery<Array<{ definition: string }>>(
				`SELECT ${definitionColumn} as "definition" FROM ${toolsTable} WHERE "ownerId" = :ownerId AND "name" = :name`,
				{ ownerId: userId1, name: 'Google Search' },
			);

			const definition = JSON.parse(rows[0].definition);
			// Should contain extra fields from the original INode definition
			expect(definition.parameters).toEqual({ query: 'test' });
			expect(definition.type).toBe('@n8n/n8n-nodes-langchain.toolSerpApi');

			await context.queryRunner.release();
		});

		it('should drop tools column from sessions and agents tables', async () => {
			const context = createTestMigrationContext(dataSource);

			if (context.isSqlite) {
				const sessionsInfo = await context.queryRunner.query(
					`PRAGMA table_info(${context.escape.tableName('chat_hub_sessions')})`,
				);
				expect(sessionsInfo.find((col: { name: string }) => col.name === 'tools')).toBeUndefined();

				const agentsInfo = await context.queryRunner.query(
					`PRAGMA table_info(${context.escape.tableName('chat_hub_agents')})`,
				);
				expect(agentsInfo.find((col: { name: string }) => col.name === 'tools')).toBeUndefined();
			} else if (context.isPostgres) {
				const sessionsResult = await context.queryRunner.query(
					"SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'tools'",
					[`${context.tablePrefix}chat_hub_sessions`],
				);
				expect(sessionsResult).toHaveLength(0);

				const agentsResult = await context.queryRunner.query(
					"SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'tools'",
					[`${context.tablePrefix}chat_hub_agents`],
				);
				expect(agentsResult).toHaveLength(0);
			}

			await context.queryRunner.release();
		});
	});
});
