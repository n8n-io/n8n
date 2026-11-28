import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CUSTOM_MCP_SERVERS_FLAG, CUSTOM_MCP_SERVERS_FLAG_VARIANT } from '@n8n/api-types';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Logger } from '@n8n/backend-common';
import {
	CacheService,
	EventService,
	PostHogClient,
	UrlService,
	type OAuthDiscoveryClient,
} from '@n8n/backend-services';
import {
	createActiveWorkflow,
	createTeamProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import {
	McpServer,
	McpServerBlock,
	McpServerConnection,
	McpServersConfig,
	McpServerTool,
	OAuthClientNamePort,
	WorkflowToolPort,
	type WorkflowToolRunResult,
} from '@n8n/backend-module-mcp-servers';
import type { Project, User } from '@n8n/db';
import { ProtectedResourceRegistry } from '@n8n/backend-services/auth';
import { Container } from '@n8n/di';
import { LocalAuthorizationServer } from '@n8n/inbound-auth';
import { DataSource } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';
import type { AddressInfo } from 'node:net';
import { v7 as uuidv7 } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { TrustedSourceDiscoveryService } from '@/modules/inbound-auth-core/trusted-source-discovery.service';
import { TrustedSourceDbStore } from '@/modules/inbound-auth-core/trusted-source.store';
import { McpProtectedResource } from '@/modules/mcp/mcp-protected-resource';
import { OAuthClient } from '@/modules/oauth-server/database/entities/oauth-client.entity';
import { RefreshToken } from '@/modules/oauth-server/database/entities/oauth-refresh-token.entity';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

/**
 * A real MCP client (the official SDK, streamable HTTP) connects to the runtime endpoint of a
 * custom server with a real token of the n8n sign-in. Only the workflow run is a spy, so that a
 * run can stay in flight for the busy case.
 */
const testServer = setupTestServer({
	modules: ['inbound-auth-core', 'oauth-jwe', 'oauth-server', 'mcp', 'mcp-servers'],
	endpointGroups: ['mcp', 'jwks', 'mcp-servers'],
});

const CLIENT_ID = 'claude-code-client';
const SECOND_CLIENT_ID = 'cursor-client';

const TRIGGER: INode = {
	id: 'trigger',
	name: 'Start',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: {
		inputSource: 'workflowInputs',
		workflowInputs: { values: [{ name: 'owner_email', type: 'string' }] },
	},
};

let member: User;
let viewer: User;
let outsider: User;
let project: Project;
let serverSlug: string;
let serverId: string;

const runtimeUrl = (slug: string) => {
	const { port } = testServer.httpServer.address() as AddressInfo;
	return new URL(`http://127.0.0.1:${port}/mcp-servers/${slug}`);
};

/** The resource URL of a server, which is also the token audience. */
const resourceUrl = (slug: string) =>
	`${Container.get(UrlService).getInstanceBaseUrl()}/mcp-servers/${slug}`;

/** An access token as the n8n sign-in issues it, for one resource. */
async function tokenFor(user: User, resource: string, clientId = CLIENT_ID) {
	const tokens = Container.get(OAuthTokenService);
	const pair = tokens.generateTokenPair(user.id, clientId, resource, []);
	await tokens.saveTokenPair(
		pair.accessToken,
		pair.refreshToken,
		clientId,
		user.id,
		[],
		pair.audience,
	);
	return pair.accessToken;
}

async function connect(token: string, slug = serverSlug, scheme = 'Bearer') {
	const client = new Client({ name: 'runtime-test', version: '1.0.0' });
	const transport = new StreamableHTTPClientTransport(runtimeUrl(slug), {
		requestInit: { headers: { Authorization: `${scheme} ${token}` } },
	});
	await client.connect(transport);
	return client;
}

async function createServer(slug: string, description: string) {
	await Container.get(DataSource).getRepository(McpServer).insert({
		id: uuidv7(),
		projectId: project.id,
		name: 'Sales tools',
		slug,
		description,
	});
	return await Container.get(DataSource).getRepository(McpServer).findOneByOrFail({ slug });
}

async function addTool(serverId: string, toolName: string, targetId: string, position: number) {
	await Container.get(DataSource)
		.getRepository(McpServerTool)
		.insert({
			id: uuidv7(),
			serverId,
			kind: 'workflow',
			targetId,
			toolName,
			description: `Description of ${toolName}`,
			draftSource: 'defaults',
			toolData: null,
			position,
		});
}

/** The runtime reads the flag for the instance, and the builder API for the user. */
function setFlag(on: boolean) {
	const postHog = Container.get(PostHogClient);
	vi.mocked(postHog.getFeatureFlagForInstance).mockResolvedValue(on ? 'test' : undefined);
	vi.mocked(postHog.getFeatureFlags).mockResolvedValue(
		on ? { [CUSTOM_MCP_SERVERS_FLAG]: CUSTOM_MCP_SERVERS_FLAG_VARIANT } : {},
	);
}

const post = (slug: string, token?: string) => {
	const request = testServer.restlessAgent
		.post(`/mcp-servers/${slug}`)
		.set('Accept', 'application/json, text/event-stream')
		.send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
	return token ? request.set('Authorization', `Bearer ${token}`) : request;
};

beforeAll(async () => {
	await Container.get(CacheService).init();
	member = await createMember();
	viewer = await createMember();
	outsider = await createMember();
	for (const [id, name] of [
		[CLIENT_ID, 'Claude Code'],
		[SECOND_CLIENT_ID, 'Cursor'],
	]) {
		await Container.get(DataSource)
			.getRepository(OAuthClient)
			.save({
				id,
				name,
				redirectUris: ['https://example.com/callback'],
				grantTypes: ['authorization_code'],
				tokenEndpointAuthMethod: 'none',
			});
	}

	// The module seeded the system source at init. Discovery normally runs as a system task: run
	// it once here, reading the local authorization server in process, never over HTTP.
	const offline = mock<OAuthDiscoveryClient>();
	const refused = new Error('discovery must not go over HTTP');
	offline.fetchOpenIdConfiguration.mockRejectedValue(refused);
	offline.fetchOAuth2ServerMetadata.mockRejectedValue(refused);
	offline.fetchJwks.mockRejectedValue(refused);
	await new TrustedSourceDiscoveryService(
		Container.get(Logger),
		Container.get(TrustedSourceDbStore),
		offline,
		Container.get(LocalAuthorizationServer),
		Container.get(EventService),
	).refresh('n8n-internal');
	await Container.get(CacheService).reset();
});

beforeEach(async () => {
	await testDb.truncate([
		'McpServerConnection',
		'McpServerBlock',
		'McpServerTool',
		'McpServer',
		'WorkflowEntity',
		'SharedWorkflow',
		'RefreshToken',
	]);
	project = await createTeamProject('Sales');
	await linkUserToProject(member, project, 'project:editor');
	await linkUserToProject(viewer, project, 'project:viewer');
	setFlag(true);

	serverSlug = `sales-tools-${uuidv7().slice(-8)}`;
	const server = await createServer(serverSlug, 'Pipeline numbers for the sales team.');
	serverId = server.id;
	const workflow = await createActiveWorkflow(
		{ name: 'Pipeline summary', nodes: [TRIGGER], connections: {} },
		project,
	);
	await addTool(server.id, 'get_pipeline_summary', workflow.id, 0);
	await addTool(server.id, 'deleted_tool', uuidv7(), 1);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Custom MCP server runtime with a real MCP client', () => {
	it('gives the server description as the instructions on initialize', async () => {
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));

		expect(client.getInstructions()).toBe('Pipeline numbers for the sales team.');
		expect(client.getServerVersion()?.name).toBe('Sales tools');
		await client.close();
	});

	it('lists each tool with its name, description, and input schema, also a broken tool', async () => {
		const client = await connect(await tokenFor(viewer, resourceUrl(serverSlug)));

		const { tools } = await client.listTools();

		expect(tools).toEqual([
			expect.objectContaining({
				name: 'get_pipeline_summary',
				description: 'Description of get_pipeline_summary',
				inputSchema: expect.objectContaining({
					type: 'object',
					// Every input is optional, as the trigger has no "required" flag.
					properties: { owner_email: { description: 'owner_email', type: ['string', 'null'] } },
				}),
			}),
			expect.objectContaining({ name: 'deleted_tool' }),
		]);
		await client.close();
	});

	it('runs the tool through its port and returns the output as JSON text', async () => {
		const port = Container.get(WorkflowToolPort);
		const run = vi.spyOn(port, 'run').mockResolvedValue({
			status: 'success',
			executionId: '1',
			finished: Promise.resolve(),
			output: [{ stage: 'Proposal', deals: 4 }],
		});
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));

		const result = await client.callTool({
			name: 'get_pipeline_summary',
			arguments: { owner_email: 'maya@example.com' },
		});

		expect(result).toEqual({
			content: [{ type: 'text', text: '[{"stage":"Proposal","deals":4}]' }],
		});
		expect(run).toHaveBeenCalledWith(
			project.id,
			expect.any(String),
			{ owner_email: 'maya@example.com' },
			expect.objectContaining({ waitMs: expect.any(Number) }),
		);
		expect(emit).toHaveBeenCalledWith(
			'mcp-server-tool-called',
			expect.objectContaining({
				userId: member.id,
				clientName: 'Claude Code',
				toolKind: 'workflow',
				status: 'success',
			}),
		);
		await client.close();
	});

	it('returns a general error result for a failed run, without the error text', async () => {
		vi.spyOn(Container.get(WorkflowToolPort), 'run').mockResolvedValue({
			status: 'error',
			executionId: '1',
			finished: Promise.resolve(),
			error: {
				message: 'connect ECONNREFUSED crm.internal:5432',
				nodeType: 'n8n-nodes-base.postgres',
			},
		});
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));

		const result = await client.callTool({ name: 'get_pipeline_summary', arguments: {} });

		expect(result).toEqual({
			isError: true,
			content: [
				{
					type: 'text',
					text: 'The workflow of this tool failed. A builder of the server can see the details in its executions.',
				},
			],
		});
		await client.close();
	});

	it('returns the text of a Stop and Error node', async () => {
		vi.spyOn(Container.get(WorkflowToolPort), 'run').mockResolvedValue({
			status: 'error',
			executionId: '1',
			finished: Promise.resolve(),
			error: { message: 'The campaign ID is unknown', nodeType: 'n8n-nodes-base.stopAndError' },
		});
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));

		const result = await client.callTool({ name: 'get_pipeline_summary', arguments: {} });

		expect(result).toEqual({
			isError: true,
			content: [{ type: 'text', text: 'The campaign ID is unknown' }],
		});
		await client.close();
	});

	it('records a failed call when the run throws', async () => {
		vi.spyOn(Container.get(WorkflowToolPort), 'run').mockRejectedValue(new Error('Lost the DB'));
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));

		await expect(
			client.callTool({ name: 'get_pipeline_summary', arguments: {} }),
		).rejects.toThrow();

		expect(emit).toHaveBeenCalledWith(
			'mcp-server-tool-called',
			expect.objectContaining({ userId: member.id, status: 'error' }),
		);
		await client.close();
	});

	it('returns an error result with the reason for a broken tool', async () => {
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));

		const result = await client.callTool({ name: 'deleted_tool', arguments: {} });

		expect(result).toEqual({
			isError: true,
			content: [{ type: 'text', text: expect.stringContaining('no longer exists') }],
		});
		await client.close();
	});

	it('says that the server is busy when the cap of runs in flight is full', async () => {
		const config = Container.get(McpServersConfig);
		const cap = config.maxConcurrentRuns;
		config.maxConcurrentRuns = 1;
		onTestFinished(() => {
			config.maxConcurrentRuns = cap;
		});
		let finish = () => {};
		const inFlight: WorkflowToolRunResult = {
			status: 'running',
			executionId: '1',
			finished: new Promise<void>((resolve) => (finish = resolve)),
		};
		vi.spyOn(Container.get(WorkflowToolPort), 'run').mockResolvedValue(inFlight);
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));

		const first = await client.callTool({ name: 'get_pipeline_summary', arguments: {} });
		const second = await client.callTool({ name: 'get_pipeline_summary', arguments: {} });
		finish();
		await inFlight.finished;
		const third = await client.callTool({ name: 'get_pipeline_summary', arguments: {} });

		expect(first.content).toEqual([
			{ type: 'text', text: expect.stringContaining('still running') },
		]);
		expect(second).toEqual({
			isError: true,
			content: [{ type: 'text', text: 'The server is busy. Try again in a moment.' }],
		});
		expect(third.content).toEqual([
			{ type: 'text', text: expect.stringContaining('still running') },
		]);
		finish();
		await client.close();
	});

	it('answers an unknown tool with a JSON-RPC error', async () => {
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));

		await expect(client.callTool({ name: 'no_such_tool', arguments: {} })).rejects.toThrow(
			/Unknown tool: no_such_tool/,
		);
		await client.close();
	});
});

describe('Custom MCP server runtime access', () => {
	it('refuses a person outside the project with 403 and insufficient_scope', async () => {
		const token = await tokenFor(outsider, resourceUrl(serverSlug));

		await expect(connect(token)).rejects.toThrow();
		const response = await post(serverSlug, token);

		expect(response.statusCode).toBe(403);
		expect(response.headers['www-authenticate']).toMatch(/error="insufficient_scope"/);
	});

	it('answers a request without a token with 401 and the resource metadata URL', async () => {
		const response = await post(serverSlug);

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toContain(
			`/.well-known/oauth-protected-resource/mcp-servers/${serverSlug}`,
		);
	});

	it('accepts the auth scheme in any case', async () => {
		const token = await tokenFor(member, resourceUrl(serverSlug));

		const client = await connect(token, serverSlug, 'bearer');

		expect((await client.listTools()).tools).toHaveLength(2);
		await client.close();
	});

	it('answers a malformed Authorization header with 401 and invalid_token', async () => {
		const response = await testServer.restlessAgent
			.post(`/mcp-servers/${serverSlug}`)
			.set('Authorization', 'Basic dXNlcjpwYXNz')
			.send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toMatch(/error="invalid_token"/);
	});

	it('answers the CORS preflight with the MCP headers', async () => {
		const response = await testServer.restlessAgent
			.options(`/mcp-servers/${serverSlug}`)
			.set('Origin', 'https://client.example.com')
			.set('Access-Control-Request-Method', 'POST')
			.expect(204);

		expect(response.headers['access-control-allow-origin']).toBe('*');
		expect(response.headers['access-control-allow-headers']).toContain('Authorization');
		expect(response.headers['access-control-allow-headers']).toContain('Mcp-Method');
	});

	it('serves the resource metadata with the server URL as the resource', async () => {
		const response = await testServer.restlessAgent
			.get(`/.well-known/oauth-protected-resource/mcp-servers/${serverSlug}`)
			.expect(200);

		expect(response.body.resource).toBe(resourceUrl(serverSlug));
		expect(response.body.authorization_servers).toEqual([
			Container.get(UrlService).getInstanceBaseUrl(),
		]);
	});

	it('refuses a token for another server with 401', async () => {
		const other = `other-tools-${uuidv7().slice(-8)}`;
		await createServer(other, '');
		const token = await tokenFor(member, resourceUrl(other));

		const response = await post(serverSlug, token);

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toMatch(/error="invalid_token"/);
	});

	it('revokes the refresh tokens of an old server when a new server takes its slug', async () => {
		const slug = `reused-tools-${uuidv7().slice(-8)}`;
		await tokenFor(member, resourceUrl(slug));
		const refreshTokens = async () =>
			await Container.get(DataSource)
				.getRepository(RefreshToken)
				.countBy({ resource: resourceUrl(slug) });
		expect(await refreshTokens()).toBe(1);

		await testServer
			.authAgentFor(member)
			.post(`/projects/${project.id}/mcp-servers`)
			.send({ name: 'Reused tools', slug })
			.expect(200);

		expect(await refreshTokens()).toBe(0);
	});

	it('refuses a token for the instance MCP with 401', async () => {
		const token = await tokenFor(member, Container.get(McpProtectedResource).getResourceUrl());

		const response = await post(serverSlug, token);

		expect(response.statusCode).toBe(401);
	});

	it('answers 404 for an unknown server, a deleted server, and the flag off', async () => {
		const token = await tokenFor(member, resourceUrl(serverSlug));
		expect((await post('no-such-server', token)).statusCode).toBe(404);

		setFlag(false);
		expect((await post(serverSlug, token)).statusCode).toBe(404);

		setFlag(true);
		await Container.get(DataSource)
			.getRepository(McpServer)
			.update({ slug: serverSlug }, { deletedAt: new Date() });
		expect((await post(serverSlug, token)).statusCode).toBe(404);
	});

	it('answers GET and DELETE with 405', async () => {
		await testServer.restlessAgent.get(`/mcp-servers/${serverSlug}`).expect(405);
		await testServer.restlessAgent.delete(`/mcp-servers/${serverSlug}`).expect(405);
	});

	it('answers GET with 404 for an unknown server', async () => {
		await testServer.restlessAgent.get('/mcp-servers/no-such-server').expect(404);
	});
});

describe('Custom MCP server connections', () => {
	const connections = () => Container.get(DataSource).getRepository(McpServerConnection);

	it('writes a connection row with the client name on the first request and sends "connected"', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const client = await connect(await tokenFor(member, resourceUrl(serverSlug)));
		await client.listTools();
		await client.close();

		expect(await connections().find()).toEqual([
			expect.objectContaining({
				serverId,
				userId: member.id,
				oauthClientId: CLIENT_ID,
				clientName: 'Claude Code',
			}),
		]);
		const connected = emit.mock.calls.filter(([name]) => name === 'mcp-server-connected');
		expect(connected).toEqual([
			['mcp-server-connected', { serverId, userId: member.id, clientName: 'Claude Code' }],
		]);
	});

	it('updates the last use at most one time each minute', async () => {
		const token = await tokenFor(member, resourceUrl(serverSlug));
		await post(serverSlug, token).expect(200);
		const key = { serverId, userId: member.id, oauthClientId: CLIENT_ID };

		const tenSecondsAgo = new Date(Date.now() - 10_000);
		await connections().update(key, { lastUsedAt: tenSecondsAgo });
		await post(serverSlug, token).expect(200);
		expect((await connections().findOneByOrFail(key)).lastUsedAt).toEqual(tenSecondsAgo);

		const twoMinutesAgo = new Date(Date.now() - 120_000);
		await connections().update(key, { lastUsedAt: twoMinutesAgo });
		await post(serverSlug, token).expect(200);
		const { firstUsedAt, lastUsedAt } = await connections().findOneByOrFail(key);
		expect(lastUsedAt.getTime()).toBeGreaterThan(Date.now() - 10_000);
		expect(firstUsedAt.getTime()).toBeLessThan(lastUsedAt.getTime() + 1);
	});

	it('answers the request when the connection write fails', async () => {
		// The client name lookup runs inside the recorder, on the first use.
		vi.spyOn(Container.get(OAuthClientNamePort), 'getName').mockRejectedValue(new Error('db down'));
		const token = await tokenFor(member, resourceUrl(serverSlug));

		await post(serverSlug, token).expect(200);
		const client = await connect(token);
		await expect(client.listTools()).resolves.toBeDefined();
		await client.close();

		expect(await connections().find()).toEqual([]);
	});

	it('writes no connection row for a refused request', async () => {
		await post(serverSlug, await tokenFor(outsider, resourceUrl(serverSlug))).expect(403);

		expect(await connections().find()).toEqual([]);
	});
});

describe('Custom MCP server block', () => {
	const blockPath = () => `/projects/${project.id}/mcp-servers/${serverId}/blocks`;

	it('refuses every client of a blocked person at once, and lets them in again after restore', async () => {
		const token = await tokenFor(viewer, resourceUrl(serverSlug));
		const secondToken = await tokenFor(viewer, resourceUrl(serverSlug), SECOND_CLIENT_ID);
		const client = await connect(token);
		const secondClient = await connect(secondToken);

		await testServer.authAgentFor(member).post(blockPath()).send({ userId: viewer.id }).expect(200);

		await expect(client.listTools()).rejects.toThrow();
		await expect(secondClient.listTools()).rejects.toThrow();
		for (const accessToken of [token, secondToken]) {
			const refused = await post(serverSlug, accessToken);
			expect(refused.statusCode).toBe(403);
			expect(refused.headers['www-authenticate']).toMatch(/error="insufficient_scope"/);
		}
		// The block deleted the refresh token, so the client cannot get a new access token.
		expect(
			await Container.get(DataSource).getRepository(RefreshToken).findBy({ userId: viewer.id }),
		).toEqual([]);

		await testServer.authAgentFor(member).delete(`${blockPath()}/${viewer.id}`).expect(200);
		// An access token from before the block works again until it ends, at most one hour later.
		expect((await post(serverSlug, token)).statusCode).toBe(200);
		const again = await connect(await tokenFor(viewer, resourceUrl(serverSlug)));
		await expect(again.listTools()).resolves.toBeDefined();
		await again.close();
	});

	it('gives the reason "blocked" on the consent page', async () => {
		await Container.get(DataSource)
			.getRepository(McpServerBlock)
			.insert({ serverId, userId: viewer.id, blockedById: member.id, blockedAt: new Date() });
		const resource = await Container.get(ProtectedResourceRegistry).getByResourceUrl(
			resourceUrl(serverSlug),
		);
		if (!resource) throw new Error('The server has no protected resource');

		expect(await resource.authorize(viewer)).toBe(false);
		expect(await resource.describeRefusal?.(viewer)).toEqual({
			reason: 'blocked',
			projectName: 'Sales',
		});
		expect(await resource.authorize(member)).toBe(true);
	});
});
