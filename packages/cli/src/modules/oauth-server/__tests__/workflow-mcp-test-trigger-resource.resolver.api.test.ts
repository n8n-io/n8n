import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWebhookData, IWorkflowBase } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let mcpEndpoint: string;
let mcpTestEndpoint: string;
let registrations: TestWebhookRegistrationsService;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');

const testResourceUrlFor = (webhookPath: string) =>
	`${webhookBaseUrl()}/${mcpTestEndpoint}/${webhookPath}`;

const prmPathFor = (webhookPath: string) =>
	`/.well-known/oauth-protected-resource/${mcpTestEndpoint}/${webhookPath}`;

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

/**
 * Mirrors what `TestWebhooks.needsWebhook` registers when the user tests an
 * MCP trigger in the editor. The workflow does not need to exist in the DB:
 * the registration is self-contained.
 */
const registerTestWebhook = async (
	webhookPath: string,
	node: INode,
	{
		workflowId = randomUUID(),
		workflowName = 'My test workflow',
	}: { workflowId?: string; workflowName?: string } = {},
) => {
	await registrations.register({
		version: 1,
		workflowEntity: {
			id: workflowId,
			name: workflowName,
			active: false,
			nodes: [node],
			connections: {},
		} as IWorkflowBase,
		webhook: {
			httpMethod: 'POST',
			path: webhookPath,
			node: node.name,
			workflowId,
		} as IWebhookData,
	});
	return { workflowId, workflowName };
};

beforeAll(async () => {
	owner = await createOwner();
	const { endpoints } = Container.get(GlobalConfig);
	mcpEndpoint = endpoints.mcp;
	mcpTestEndpoint = endpoints.mcpTest;
	registrations = Container.get(TestWebhookRegistrationsService);
});

afterEach(async () => {
	await Container.get(CacheService).reset(); // test webhook registrations live in the cache
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

describe('protected resource metadata for test MCP triggers', () => {
	test('should serve the metadata document while a test registration exists', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, mcpTriggerNode());

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		// exact match: `scopes_supported` must be absent (the resource advertises no scopes)
		expect(response.body).toEqual({
			resource: testResourceUrlFor(webhookPath),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
		});
	});

	test('should resolve from the registration alone, without the workflow in the DB', async () => {
		const webhookPath = randomUUID();
		const { workflowName } = await registerTestWebhook(webhookPath, mcpTriggerNode(), {
			workflowName: 'Unsaved workflow',
		});

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		expect(workflowName).toBe('Unsaved workflow');
	});

	test('should not resolve an unknown test path', async () => {
		const response = await testServer.restlessAgent.get(prmPathFor(randomUUID()));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the registration node name does not match', async () => {
		const webhookPath = randomUUID();
		// the webhook points at a node name absent from the registered workflow
		await registrations.register({
			version: 1,
			workflowEntity: {
				id: randomUUID(),
				name: 'My test workflow',
				active: false,
				nodes: [mcpTriggerNode()],
				connections: {},
			} as IWorkflowBase,
			webhook: {
				httpMethod: 'POST',
				path: webhookPath,
				node: 'Ghost node',
				workflowId: randomUUID(),
			} as IWebhookData,
		});

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test.each([
		['authentication is none', mcpTriggerNode({ authentication: 'none' })],
		['authentication is bearerAuth', mcpTriggerNode({ authentication: 'bearerAuth' })],
		['the node is disabled', mcpTriggerNode({ disabled: true })],
	])('should not resolve when %s', async (_, node) => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, node);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should stop resolving as soon as the registration is removed', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, mcpTriggerNode());

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(200);

		await registrations.deregister(registrations.toKey({ httpMethod: 'POST', path: webhookPath }));

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(404);
	});
});

describe('test vs production resources', () => {
	const registerOAuthClient = async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send({
			client_name: 'test-resolver-tests',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
		});
		expect(response.statusCode).toBe(201);
		return response.body.client_id as string;
	};

	test('should serve the same trigger path as two distinct resources', async () => {
		const webhookPath = randomUUID();
		const node = mcpTriggerNode();

		// production: active workflow with published version + webhook row
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await Container.get(WebhookRepository).insert({
			workflowId: workflow.id,
			webhookPath,
			method: 'POST',
			node: node.name,
		});

		// test: editor registration for the same path
		await registerTestWebhook(webhookPath, node, { workflowId: workflow.id });

		const production = await testServer.restlessAgent.get(
			`/.well-known/oauth-protected-resource/${mcpEndpoint}/${webhookPath}`,
		);
		const test = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(production.statusCode).toBe(200);
		expect(test.statusCode).toBe(200);
		expect(production.body.resource).not.toBe(test.body.resource);
	});

	test('should reject a test-resource token at the production resource and vice versa', async () => {
		const webhookPath = randomUUID();
		const node = mcpTriggerNode();

		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await Container.get(WebhookRepository).insert({
			workflowId: workflow.id,
			webhookPath,
			method: 'POST',
			node: node.name,
		});
		await registerTestWebhook(webhookPath, node, { workflowId: workflow.id });

		const clientId = await registerOAuthClient();
		const tokenService = Container.get(OAuthTokenService);
		const productionResourceUrl = `${webhookBaseUrl()}/${mcpEndpoint}/${webhookPath}`;
		const testResourceUrl = testResourceUrlFor(webhookPath);

		const testToken = tokenService.generateTokenPair(owner.id, clientId, testResourceUrl);
		await tokenService.saveTokenPair(
			testToken.accessToken,
			testToken.refreshToken,
			clientId,
			owner.id,
		);
		const productionToken = tokenService.generateTokenPair(
			owner.id,
			clientId,
			productionResourceUrl,
		);
		await tokenService.saveTokenPair(
			productionToken.accessToken,
			productionToken.refreshToken,
			clientId,
			owner.id,
		);

		await expect(
			tokenService.verifyAccessToken(testToken.accessToken, testResourceUrl),
		).resolves.toMatchObject({ clientId });
		await expect(
			tokenService.verifyAccessToken(productionToken.accessToken, productionResourceUrl),
		).resolves.toMatchObject({ clientId });

		await expect(
			tokenService.verifyAccessToken(testToken.accessToken, productionResourceUrl),
		).rejects.toThrow();
		await expect(
			tokenService.verifyAccessToken(productionToken.accessToken, testResourceUrl),
		).rejects.toThrow();
	});
});
