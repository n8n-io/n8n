import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let mcpEndpoint: string;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');

const resourceUrlFor = (webhookPath: string) => `${webhookBaseUrl()}/${mcpEndpoint}/${webhookPath}`;

const prmPathFor = (webhookPath: string) =>
	`/.well-known/oauth-protected-resource/${mcpEndpoint}/${webhookPath}`;

const mcpTriggerNode = ({
	name = 'MCP Server Trigger',
	authentication = 'n8nOAuth2',
	disabled = false,
}: {
	name?: string;
	authentication?: string;
	disabled?: boolean;
} = {}): INode => ({
	id: randomUUID(),
	name,
	type: MCP_TRIGGER_NODE_TYPE,
	typeVersion: 2,
	position: [0, 0],
	disabled,
	parameters: { path: 'unused', authentication },
});

/** Mirrors what `ActiveWorkflowManager.addWebhooks` persists on activation. */
const insertWebhookRow = async (workflowId: string, webhookPath: string, node: string) => {
	await Container.get(WebhookRepository).insert({ workflowId, webhookPath, method: 'POST', node });
};

/** Active workflow whose published version contains the given trigger node. */
const createPublishedMcpWorkflow = async (webhookPath: string, node: INode) => {
	const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
	await setActiveVersion(workflow.id, workflow.versionId);
	await insertWebhookRow(workflow.id, webhookPath, node.name);
	return workflow;
};

/** Overwrite the draft nodes without touching the published (active) version. */
const updateDraftNodes = async (workflowId: string, nodes: INode[]) => {
	await Container.get(WorkflowRepository).update(workflowId, { nodes, versionId: randomUUID() });
};

const registerOAuthClient = async () => {
	const response = await testServer.restlessAgent.post('/mcp-oauth/register').send({
		client_name: 'resolver-tests',
		redirect_uris: ['https://example.com/callback'],
		grant_types: ['authorization_code'],
		token_endpoint_auth_method: 'none',
	});
	expect(response.statusCode).toBe(201);
	return response.body.client_id as string;
};

const authorizeQueryFor = (clientId: string, resource: string) => ({
	response_type: 'code',
	client_id: clientId,
	redirect_uri: 'https://example.com/callback',
	// PKCE values are only verified at the token exchange, any well-formed challenge works here
	code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
	code_challenge_method: 'S256',
	state: 'state',
	resource,
});

const decodeJwtPayload = (token: string): Record<string, unknown> =>
	JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<string, unknown>;

beforeAll(async () => {
	owner = await createOwner();
	mcpEndpoint = Container.get(GlobalConfig).endpoints.mcp;
});

afterEach(async () => {
	await Container.get(CacheService).reset(); // WebhookService caches static webhook lookups
	await testDb.truncate([
		'AccessToken',
		'RefreshToken',
		'AuthorizationCode',
		'OAuthClient',
		'WebhookEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
	]);
});

describe('protected resource metadata for workflow MCP triggers', () => {
	test('should serve the metadata document for an active n8nOAuth2 trigger', async () => {
		const webhookPath = randomUUID();
		await createPublishedMcpWorkflow(webhookPath, mcpTriggerNode());

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		// exact match: `scopes_supported` must be absent (the resource advertises no scopes)
		expect(response.body).toEqual({
			resource: resourceUrlFor(webhookPath),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
		});
	});

	test('should tolerate a trailing slash', async () => {
		const webhookPath = randomUUID();
		await createPublishedMcpWorkflow(webhookPath, mcpTriggerNode());

		const response = await testServer.restlessAgent.get(`${prmPathFor(webhookPath)}/`);

		expect(response.statusCode).toBe(200);
		expect(response.body.resource).toBe(resourceUrlFor(webhookPath));
	});

	test('should expose the workflow name for the consent screen', async () => {
		const webhookPath = randomUUID();
		const workflow = await createPublishedMcpWorkflow(webhookPath, mcpTriggerNode());

		const resource = await Container.get(ProtectedResourceRegistry).getByResourcePath(
			`/${mcpEndpoint}/${webhookPath}`,
		);

		expect(resource?.displayName).toBe(workflow.name);
	});

	test('should not resolve an unknown path', async () => {
		const response = await testServer.restlessAgent.get(prmPathFor(randomUUID()));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a non-mcp path even if the webhook exists', async () => {
		const webhookPath = randomUUID();
		await createPublishedMcpWorkflow(webhookPath, mcpTriggerNode());

		const response = await testServer.restlessAgent.get(
			`/.well-known/oauth-protected-resource/webhook/${webhookPath}`,
		);

		expect(response.statusCode).toBe(404);
	});

	test.each([
		['authentication is none', mcpTriggerNode({ authentication: 'none' })],
		['authentication is bearerAuth', mcpTriggerNode({ authentication: 'bearerAuth' })],
		['authentication is an expression', mcpTriggerNode({ authentication: '={{ $json.auth }}' })],
		['the node is disabled', mcpTriggerNode({ disabled: true })],
	])('should not resolve when %s', async (_, node) => {
		const webhookPath = randomUUID();
		await createPublishedMcpWorkflow(webhookPath, node);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a workflow without a published version', async () => {
		const node = mcpTriggerNode();
		const webhookPath = randomUUID();
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await insertWebhookRow(workflow.id, webhookPath, node.name);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the webhook node is missing from the active version', async () => {
		const node = mcpTriggerNode();
		const webhookPath = randomUUID();
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		// the webhook row points at a node name that the published version does not contain
		await insertWebhookRow(workflow.id, webhookPath, 'Ghost node');

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a dynamic webhook path', async () => {
		const node = mcpTriggerNode();
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		const webhookId = randomUUID();
		await Container.get(WebhookRepository).insert({
			workflowId: workflow.id,
			webhookPath: ':param',
			method: 'POST',
			node: node.name,
			webhookId,
			pathLength: 1,
		});

		const response = await testServer.restlessAgent.get(prmPathFor(`${webhookId}/anything`));

		expect(response.statusCode).toBe(404);
	});

	test('should follow the published version, not the draft', async () => {
		// published n8nOAuth2, draft switched to none -> resource stays
		const protectedPath = randomUUID();
		const protectedWorkflow = await createPublishedMcpWorkflow(protectedPath, mcpTriggerNode());
		await updateDraftNodes(protectedWorkflow.id, [mcpTriggerNode({ authentication: 'none' })]);

		const stillProtected = await testServer.restlessAgent.get(prmPathFor(protectedPath));
		expect(stillProtected.statusCode).toBe(200);
		// pin which resource resolved, not merely that something did
		expect(stillProtected.body.resource).toBe(resourceUrlFor(protectedPath));

		// published none, draft switched to n8nOAuth2 -> no resource
		const unprotectedPath = randomUUID();
		const unprotectedWorkflow = await createPublishedMcpWorkflow(
			unprotectedPath,
			mcpTriggerNode({ authentication: 'none' }),
		);
		await updateDraftNodes(unprotectedWorkflow.id, [mcpTriggerNode()]);

		const stillUnprotected = await testServer.restlessAgent.get(prmPathFor(unprotectedPath));
		expect(stillUnprotected.statusCode).toBe(404);
	});

	test('should stop resolving once the webhook is deregistered', async () => {
		const webhookPath = randomUUID();
		await createPublishedMcpWorkflow(webhookPath, mcpTriggerNode());

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(200);

		// what `clearWebhooks` does on deactivation
		await Container.get(WebhookRepository).delete({ webhookPath });
		await Container.get(CacheService).reset();

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(404);
	});
});

describe('resource indicator validation at authorize', () => {
	test('should accept the trigger URL as resource indicator', async () => {
		const webhookPath = randomUUID();
		await createPublishedMcpWorkflow(webhookPath, mcpTriggerNode());
		const clientId = await registerOAuthClient();

		const response = await testServer.restlessAgent
			.get('/mcp-oauth/authorize')
			.query(authorizeQueryFor(clientId, resourceUrlFor(webhookPath)));

		expect(response.statusCode).toBe(302);
		expect(response.headers.location).toContain('/oauth/consent');
	});

	test.each([
		['an unknown trigger path', () => resourceUrlFor(randomUUID())],
		['a foreign origin', (webhookPath: string) => `https://evil.example/mcp/${webhookPath}`],
		[
			'a suffix-spoofed host',
			(webhookPath: string) => {
				const base = new URL(webhookBaseUrl());
				const port = base.port ? `:${base.port}` : '';
				return `${base.protocol}//${base.hostname}.evil.example${port}/${mcpEndpoint}/${webhookPath}`;
			},
		],
	])('should reject %s with invalid_target', async (_, makeResource) => {
		const webhookPath = randomUUID();
		await createPublishedMcpWorkflow(webhookPath, mcpTriggerNode());
		const clientId = await registerOAuthClient();

		const response = await testServer.restlessAgent
			.get('/mcp-oauth/authorize')
			.query(authorizeQueryFor(clientId, makeResource(webhookPath)));

		expect(response.statusCode).toBe(400);
		expect(response.body.error).toBe('invalid_target');
	});
});

describe('token audience', () => {
	test('should mint tokens whose audience is the trigger URL and reject cross-resource use', async () => {
		const pathA = randomUUID();
		const pathB = randomUUID();
		await createPublishedMcpWorkflow(pathA, mcpTriggerNode());
		await createPublishedMcpWorkflow(pathB, mcpTriggerNode());
		const clientId = await registerOAuthClient();
		const tokenService = Container.get(OAuthTokenService);

		const { accessToken, refreshToken } = tokenService.generateTokenPair(
			owner.id,
			clientId,
			resourceUrlFor(pathA),
		);
		await tokenService.saveTokenPair(accessToken, refreshToken, clientId, owner.id);

		expect(decodeJwtPayload(accessToken).aud).toBe(resourceUrlFor(pathA));

		await expect(
			tokenService.verifyAccessToken(accessToken, resourceUrlFor(pathA)),
		).resolves.toMatchObject({ clientId });

		// a token minted for workflow A must fail workflow B's audience gate
		await expect(
			tokenService.verifyAccessToken(accessToken, resourceUrlFor(pathB)),
		).rejects.toThrow();
	});

	test('should reject an instance MCP token at a workflow resource', async () => {
		const webhookPath = randomUUID();
		await createPublishedMcpWorkflow(webhookPath, mcpTriggerNode());
		const clientId = await registerOAuthClient();
		const tokenService = Container.get(OAuthTokenService);

		// no resource indicator -> falls back to the default resource (instance MCP)
		const { accessToken, refreshToken } = tokenService.generateTokenPair(owner.id, clientId);
		await tokenService.saveTokenPair(accessToken, refreshToken, clientId, owner.id);

		expect(decodeJwtPayload(accessToken).aud).not.toBe(resourceUrlFor(webhookPath));
		await expect(
			tokenService.verifyAccessToken(accessToken, resourceUrlFor(webhookPath)),
		).rejects.toThrow();
	});
});
