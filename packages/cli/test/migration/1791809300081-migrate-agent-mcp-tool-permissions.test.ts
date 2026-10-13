import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig, AgentJsonMcpServerConfig } from '@n8n/api-types';
import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import { jsonParse, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { buildMcpClientForServer } from '@/modules/agents/json-config/mcp-client-factory';
import type { OauthService } from '@/oauth/oauth.service';

const MIGRATION_NAME = 'MigrateAgentMcpToolPermissions1791809300081';

type Fixture = {
	name: string;
	schema: unknown;
	expected: unknown;
};

const conversionFixtures: Fixture[] = [
	{
		name: 'defaults',
		schema: { mcpServers: [{ name: 'plain', url: 'https://example.test' }] },
		expected: {
			mcpServers: [
				{
					name: 'plain',
					url: 'https://example.test',
					toolPermissions: {
						categories: { read: 'always_allow', write: 'always_allow' },
					},
				},
			],
		},
	},
	{
		name: 'global approval',
		schema: { mcpServers: [{ approval: { mode: 'global' } }] },
		expected: {
			mcpServers: [
				{
					toolPermissions: {
						categories: { read: 'require_approval', write: 'require_approval' },
					},
				},
			],
		},
	},
	{
		name: 'selected approval',
		schema: {
			mcpServers: [{ approval: { mode: 'selected', tools: ['search', 'update'] } }],
		},
		expected: {
			mcpServers: [
				{
					toolPermissions: {
						categories: { read: 'always_allow', write: 'always_allow' },
						tools: { search: 'require_approval', update: 'require_approval' },
					},
				},
			],
		},
	},
	{
		name: 'allow filter',
		schema: { mcpServers: [{ toolFilter: { mode: 'allow', tools: ['search'] } }] },
		expected: {
			mcpServers: [
				{
					toolPermissions: {
						categories: { read: 'blocked', write: 'blocked' },
						tools: { search: 'always_allow' },
					},
				},
			],
		},
	},
	{
		name: 'allow filter with selected approval',
		schema: {
			mcpServers: [
				{
					toolFilter: { mode: 'allow', tools: ['search', 'update'] },
					approval: { mode: 'selected', tools: ['update', 'not-allowed'] },
				},
			],
		},
		expected: {
			mcpServers: [
				{
					toolPermissions: {
						categories: { read: 'blocked', write: 'blocked' },
						tools: { search: 'always_allow', update: 'require_approval' },
					},
				},
			],
		},
	},
	{
		name: 'exclude filter with global approval',
		schema: {
			mcpServers: [
				{
					toolFilter: { mode: 'exclude', tools: ['delete'] },
					approval: { mode: 'global' },
				},
			],
		},
		expected: {
			mcpServers: [
				{
					toolPermissions: {
						categories: { read: 'require_approval', write: 'require_approval' },
						tools: { delete: 'blocked' },
					},
				},
			],
		},
	},
	{
		name: 'exclude filter overrides selected approval',
		schema: {
			mcpServers: [
				{
					toolFilter: { mode: 'exclude', tools: ['update', 'delete'] },
					approval: { mode: 'selected', tools: ['search', 'update'] },
				},
			],
		},
		expected: {
			mcpServers: [
				{
					toolPermissions: {
						categories: { read: 'always_allow', write: 'always_allow' },
						tools: {
							search: 'require_approval',
							update: 'blocked',
							delete: 'blocked',
						},
					},
				},
			],
		},
	},
];

const preservationFixtures: Fixture[] = [
	{
		name: 'mixed servers and unrelated fields',
		schema: {
			name: 'Agent config',
			metadata: { retained: true },
			mcpServers: [
				{
					name: 'legacy',
					headers: { Authorization: 'retained' },
					toolFilter: { mode: 'exclude', tools: ['delete'] },
				},
				{
					name: 'current',
					toolPermissions: {
						categories: { read: 'blocked', write: 'require_approval' },
						tools: { search: 'always_allow' },
					},
				},
				{
					name: 'current with stale fields',
					toolPermissions: {
						categories: { read: 'blocked', write: 'require_approval' },
						tools: { search: 'always_allow' },
					},
					toolFilter: { invalid: true },
					approval: null,
					custom: 'retained',
				},
			],
		},
		expected: {
			name: 'Agent config',
			metadata: { retained: true },
			mcpServers: [
				{
					name: 'legacy',
					headers: { Authorization: 'retained' },
					toolPermissions: {
						categories: { read: 'always_allow', write: 'always_allow' },
						tools: { delete: 'blocked' },
					},
				},
				{
					name: 'current',
					toolPermissions: {
						categories: { read: 'blocked', write: 'require_approval' },
						tools: { search: 'always_allow' },
					},
				},
				{
					name: 'current with stale fields',
					toolPermissions: {
						categories: { read: 'blocked', write: 'require_approval' },
						tools: { search: 'always_allow' },
					},
					custom: 'retained',
				},
			],
		},
	},
];

const unchangedFixtures: Fixture[] = [
	{
		name: 'missing mcpServers',
		schema: { name: 'Agent config' },
		expected: { name: 'Agent config' },
	},
	// PostgreSQL excludes this row by key depth. SQLite selects it, then structural validation rejects it.
	{
		name: 'nested mcpServers key',
		schema: { metadata: { mcpServers: [{ approval: { mode: 'global' } }] } },
		expected: { metadata: { mcpServers: [{ approval: { mode: 'global' } }] } },
	},
	{ name: 'empty mcpServers', schema: { mcpServers: [] }, expected: { mcpServers: [] } },
	{
		name: 'already migrated',
		schema: {
			mcpServers: [
				{
					toolPermissions: {
						categories: { read: 'always_allow', write: 'blocked' },
					},
				},
			],
		},
		expected: {
			mcpServers: [
				{
					toolPermissions: {
						categories: { read: 'always_allow', write: 'blocked' },
					},
				},
			],
		},
	},
];

const malformedFixtures: Fixture[] = [
	{ name: 'null schema', schema: null, expected: null },
	{ name: 'primitive schema', schema: 'legacy', expected: 'legacy' },
	{ name: 'non-array servers', schema: { mcpServers: {} }, expected: { mcpServers: {} } },
	{
		name: 'invalid server entry',
		schema: { mcpServers: [null] },
		expected: { mcpServers: [null] },
	},
	{
		name: 'invalid legacy filter',
		schema: { mcpServers: [{ toolFilter: { mode: 'allow', tools: 'search' } }] },
		expected: { mcpServers: [{ toolFilter: { mode: 'allow', tools: 'search' } }] },
	},
	{
		name: 'invalid legacy approval',
		schema: { mcpServers: [{ approval: { mode: 'selected' } }] },
		expected: { mcpServers: [{ approval: { mode: 'selected' } }] },
	},
];

const fixtures = [
	...conversionFixtures,
	...preservationFixtures,
	...unchangedFixtures,
	...malformedFixtures,
];

function parseStoredSchema(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	try {
		return jsonParse<unknown>(value);
	} catch {
		return value;
	}
}

describe('MigrateAgentMcpToolPermissions migration', () => {
	let dataSource: DataSource;
	const credentialProvider = mock<CredentialProvider>();
	const oauthService = mock<OauthService>();
	const configBase = {
		name: 'Agent',
		model: 'openai/gpt-4o',
		credential: 'test-credential',
		instructions: 'Help the user',
	};
	const serverBase = {
		name: 'restricted',
		url: 'https://mcp.example.test/mcp',
		transport: 'streamableHttp',
		authentication: 'none',
	};
	const agentTables = [
		{ table: 'agents', idColumn: 'id' },
		{ table: 'agent_history', idColumn: 'versionId' },
	] as const;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertAgentConfig({ escape, runQuery }: TestMigrationContext, schema: unknown) {
		const agentId = randomUUID();
		const versionId = randomUUID();
		const projectId = randomUUID();
		const now = new Date();
		const c = escape.columnName;
		await runQuery(
			`INSERT INTO ${escape.tableName('project')} (${c('id')}, ${c('name')}, ${c('type')}, ${c('createdAt')}, ${c('updatedAt')})
			 VALUES (:projectId, 'Project', 'personal', :now, :now)`,
			{ projectId, now },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents')}
			 (${c('id')}, ${c('name')}, ${c('projectId')}, ${c('schema')}, ${c('integrations')}, ${c('tools')}, ${c('skills')}, ${c('createdAt')}, ${c('updatedAt')})
			 VALUES (:agentId, 'Agent', :projectId, :schema, '[]', '{}', '{}', :now, :now)`,
			{ agentId, projectId, schema: JSON.stringify(schema), now },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agent_history')}
			 (${c('versionId')}, ${c('agentId')}, ${c('schema')}, ${c('author')}, ${c('createdAt')}, ${c('updatedAt')})
			 VALUES (:versionId, :agentId, :schema, 'Test User', :now, :now)`,
			{ versionId, agentId, schema: JSON.stringify(schema), now },
		);
		return { agentId, versionId, projectId };
	}

	async function discoverRuntimePermissions(server: AgentJsonMcpServerConfig, projectId: string) {
		const scope = nock('https://mcp.example.test')
			.post('/mcp', /"method":"initialize"/)
			.reply(
				200,
				(_uri, body) => ({
					jsonrpc: '2.0',
					id: (body as { id: number }).id,
					result: {
						protocolVersion: '2025-06-18',
						capabilities: { tools: {} },
						serverInfo: { name: 'Test Server', version: '1.0.0' },
					},
				}),
				{ 'content-type': 'application/json' },
			)
			.post('/mcp', /"method":"notifications\/initialized"/)
			.reply(202)
			.get('/mcp')
			.optionally()
			.reply(405)
			.post('/mcp', /"method":"tools\/list"/)
			.reply(
				200,
				(_uri, body) => ({
					jsonrpc: '2.0',
					id: (body as { id: number }).id,
					result: {
						tools: ['search', 'delete'].map((name) => ({
							name,
							description: name,
							inputSchema: { type: 'object', properties: {} },
						})),
					},
				}),
				{ 'content-type': 'application/json' },
			);
		const client = await buildMcpClientForServer(server, {
			credentialProvider,
			oauthService,
			projectId,
			proxyFetch: fetch,
		});
		try {
			const tools = await client.listTools();
			expect(client.getConnectionFailures()).toEqual([]);
			expect(scope.isDone()).toBe(true);
			return tools.map((tool) => ({
				name: tool.mcpToolName,
				requiresApproval: tool.approval?.required ?? false,
			}));
		} finally {
			await client.close();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
	}, 60_000);

	afterEach(() => {
		nock.cleanAll();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('migrates legacy permissions in agents and agent history without changing skipped data', async () => {
		const rows = fixtures.map((fixture) => ({
			...fixture,
			agentId: randomUUID(),
			versionId: randomUUID(),
		}));

		await withContext(async ({ escape, runQuery }) => {
			const projectId = randomUUID();
			const now = new Date();
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
				 VALUES (:projectId, 'Project', 'personal', :now, :now)`,
				{ projectId, now },
			);

			for (const row of rows) {
				await runQuery(
					`INSERT INTO ${escape.tableName('agents')}
					 ("id", "name", "projectId", "schema", "integrations", "tools", "skills", "createdAt", "updatedAt")
					 VALUES (:id, :name, :projectId, :schema, '[]', '{}', '{}', :now, :now)`,
					{
						id: row.agentId,
						name: row.name,
						projectId,
						schema: JSON.stringify(row.schema),
						now,
					},
				);
				await runQuery(
					`INSERT INTO ${escape.tableName('agent_history')}
					 ("versionId", "agentId", "schema", "author", "createdAt", "updatedAt")
					 VALUES (:versionId, :agentId, :schema, 'Test User', :now, :now)`,
					{
						versionId: row.versionId,
						agentId: row.agentId,
						schema: JSON.stringify(row.schema),
						now,
					},
				);
			}
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async ({ escape, runQuery }) => {
			const agentRows = await runQuery<Array<{ id: string; schema: unknown }>>(
				`SELECT "id", "schema" FROM ${escape.tableName('agents')}`,
			);
			const historyRows = await runQuery<Array<{ versionId: string; schema: unknown }>>(
				`SELECT "versionId", "schema" FROM ${escape.tableName('agent_history')}`,
			);

			const agentsById = new Map(agentRows.map((row) => [row.id, parseStoredSchema(row.schema)]));
			const historyById = new Map(
				historyRows.map((row) => [row.versionId, parseStoredSchema(row.schema)]),
			);

			for (const row of rows) {
				expect(agentsById.get(row.agentId), `${row.name} in agents`).toEqual(row.expected);
				expect(historyById.get(row.versionId), `${row.name} in agent_history`).toEqual(
					row.expected,
				);
			}
		});
	});

	it('processes only rows with MCP server candidates', async () => {
		const schemas = [
			{},
			{ name: 'No MCP server' },
			{ metadata: { retained: true } },
			{ mcpServers: [] },
			{ mcpServers: [{ name: 'MCP server' }] },
		];
		const loggerInfo = vi.spyOn(Container.get(Logger), 'info').mockImplementation(() => {});

		try {
			await withContext(async ({ escape, runQuery }) => {
				const projectId = randomUUID();
				const now = new Date();
				await runQuery(
					`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
					 VALUES (:projectId, 'Project', 'personal', :now, :now)`,
					{ projectId, now },
				);

				for (const [index, schema] of schemas.entries()) {
					const agentId = randomUUID();
					await runQuery(
						`INSERT INTO ${escape.tableName('agents')}
						 ("id", "name", "projectId", "schema", "integrations", "tools", "skills", "createdAt", "updatedAt")
						 VALUES (:agentId, :name, :projectId, :schema, '[]', '{}', '{}', :now, :now)`,
						{
							agentId,
							name: `Agent ${index}`,
							projectId,
							schema: JSON.stringify(schema),
							now,
						},
					);
					await runQuery(
						`INSERT INTO ${escape.tableName('agent_history')}
						 ("versionId", "agentId", "schema", "author", "createdAt", "updatedAt")
						 VALUES (:versionId, :agentId, :schema, 'Test User', :now, :now)`,
						{
							versionId: randomUUID(),
							agentId,
							schema: JSON.stringify(schema),
							now,
						},
					);
				}
			});

			await runSingleMigration(MIGRATION_NAME);

			expect(loggerInfo).toHaveBeenCalledWith(
				`[${MIGRATION_NAME}] Processed 2 agents rows; migrated 1; skipped 0 malformed rows.`,
			);
			expect(loggerInfo).toHaveBeenCalledWith(
				`[${MIGRATION_NAME}] Processed 2 agent_history rows; migrated 1; skipped 0 malformed rows.`,
			);
		} finally {
			loggerInfo.mockRestore();
		}
	});

	it('preserves migrated MCP permissions during runtime tool discovery', async () => {
		const schema = {
			...configBase,
			mcpServers: [
				{
					...serverBase,
					toolFilter: { mode: 'exclude', tools: ['delete'] },
					approval: { mode: 'global' },
				},
			],
		};
		const { agentId, projectId } = await withContext(
			async (context) => await insertAgentConfig(context, schema),
		);
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const [row] = await withContext(
			async ({ escape, runQuery }) =>
				await runQuery<Array<{ schema: unknown }>>(
					`SELECT ${escape.columnName('schema')} FROM ${escape.tableName('agents')}
						 WHERE ${escape.columnName('id')} = :id`,
					{ id: agentId },
				),
		);
		const config = parseStoredSchema(row.schema) as AgentJsonConfig;
		const server = config.mcpServers?.[0];
		expect(server).toBeDefined();
		if (!server) throw new Error('MCP server is missing');

		await expect(discoverRuntimePermissions(server, projectId)).resolves.toEqual([
			{ name: 'search', requiresApproval: true },
		]);
	});

	it.each(agentTables)(
		'does not run skipped $table configs without their MCP permissions',
		async ({ table, idColumn }) => {
			const schema = {
				...configBase,
				mcpServers: [
					{
						...serverBase,
						toolFilter: { mode: 'exclude', tools: ['delete'] },
						approval: { mode: 'global' },
					},
					{
						...serverBase,
						name: 'malformed',
						toolFilter: { mode: 'allow', tools: 'search' },
					},
				],
			};
			const { agentId, versionId, projectId } = await withContext(
				async (context) => await insertAgentConfig(context, schema),
			);
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const [row] = await withContext(
				async ({ escape, runQuery }) =>
					await runQuery<Array<{ schema: unknown }>>(
						`SELECT ${escape.columnName('schema')} FROM ${escape.tableName(table)}
					 WHERE ${escape.columnName(idColumn)} = :id`,
						{ id: table === 'agents' ? agentId : versionId },
					),
			);
			const config = parseStoredSchema(row.schema) as AgentJsonConfig;
			expect(config).toEqual(schema);
			const server = config.mcpServers?.[0];
			expect(server).toBeDefined();
			if (!server) throw new Error('MCP server is missing');

			const permissions = await discoverRuntimePermissions(server, projectId).catch(
				(error: unknown) => {
					expect(error).toBeInstanceOf(UserError);
					return undefined;
				},
			);
			// A skipped policy must retain its behavior or stop the server from running.
			if (permissions === undefined) return;
			expect(permissions).toEqual([{ name: 'search', requiresApproval: true }]);
		},
	);
});
