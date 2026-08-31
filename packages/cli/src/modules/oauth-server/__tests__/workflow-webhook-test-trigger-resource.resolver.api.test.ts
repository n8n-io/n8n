import {
	createWorkflowWithHistory,
	setActiveVersion,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IHttpRequestMethods, INode, IWebhookData, IWorkflowBase } from 'n8n-workflow';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let member: User;
let webhookEndpoint: string;
let webhookTestEndpoint: string;
let registrations: TestWebhookRegistrationsService;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const testWebhookBaseUrl = () =>
	Container.get(UrlService).getTestWebhookBaseUrl().replace(/\/$/, '');

const resourceUrlFor = (webhookPath: string, method: IHttpRequestMethods = 'POST') =>
	`${testWebhookBaseUrl()}/${webhookTestEndpoint}/${webhookPath}?method=${method}`;
const prmPathFor = (webhookPath: string, method?: IHttpRequestMethods) =>
	`/.well-known/oauth-protected-resource/${webhookTestEndpoint}/${webhookPath}` +
	(method ? `?method=${method}` : '');

const webhookNode = ({
	name = 'Webhook',
	authentication = 'n8nOAuth2',
	disabled = false,
	requireExecuteAccess,
}: {
	name?: string;
	authentication?: string;
	disabled?: boolean;
	requireExecuteAccess?: boolean;
} = {}): INode => ({
	id: randomUUID(),
	name,
	type: WEBHOOK_NODE_TYPE,
	typeVersion: 2.1,
	position: [0, 0],
	disabled,
	parameters: {
		path: 'unused',
		httpMethod: 'POST',
		authentication,
		...(requireExecuteAccess === undefined ? {} : { requireExecuteAccess }),
	},
});

/**
 * Mirrors what `TestWebhooks.needsWebhook` registers — one row per method — when
 * the user tests a webhook trigger in the editor. The workflow does not need to
 * exist in the DB: the registration is self-contained.
 */
const registerTestWebhook = async (
	webhookPath: string,
	node: INode,
	{
		workflowId = randomUUID(),
		workflowName = 'My test workflow',
		methods = ['POST'] as IHttpRequestMethods[],
		webhookId,
	}: {
		workflowId?: string;
		workflowName?: string;
		methods?: IHttpRequestMethods[];
		webhookId?: string;
	} = {},
) => {
	for (const httpMethod of methods) {
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
				httpMethod,
				path: webhookPath,
				node: node.name,
				workflowId,
				...(webhookId ? { webhookId } : {}),
			} as IWebhookData,
		});
	}
	return { workflowId, workflowName };
};

const resolveResource = async (webhookPath: string, method?: IHttpRequestMethods) =>
	await Container.get(ProtectedResourceRegistry).getByResourcePath(
		`/${webhookTestEndpoint}/${webhookPath}` + (method ? `?method=${method}` : ''),
	);

const registerOAuthClient = async () => {
	const response = await testServer.restlessAgent.post('/mcp-oauth/register').send({
		client_name: 'webhook-test-resolver-tests',
		redirect_uris: ['https://example.com/callback'],
		grant_types: ['authorization_code'],
		token_endpoint_auth_method: 'none',
	});
	expect(response.statusCode).toBe(201);
	return response.body.client_id as string;
};

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
	const { endpoints } = Container.get(GlobalConfig);
	webhookEndpoint = endpoints.webhook;
	webhookTestEndpoint = endpoints.webhookTest;
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

describe('protected resource metadata for test webhook triggers', () => {
	test('should serve the metadata document while a test registration exists', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, webhookNode());

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			resource: resourceUrlFor(webhookPath),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
		});
	});

	test('should resolve from the registration alone, without the workflow in the DB', async () => {
		const webhookPath = randomUUID();
		const { workflowName } = await registerTestWebhook(webhookPath, webhookNode(), {
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
		await registrations.register({
			version: 1,
			workflowEntity: {
				id: randomUUID(),
				name: 'My test workflow',
				active: false,
				nodes: [webhookNode()],
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

	test('should not resolve a non-test-webhook path even if the registration exists', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, webhookNode());

		const response = await testServer.restlessAgent.get(
			`/.well-known/oauth-protected-resource/${webhookEndpoint}/${webhookPath}`,
		);

		expect(response.statusCode).toBe(404);
	});

	test.each([
		['authentication is none', webhookNode({ authentication: 'none' })],
		['authentication is basicAuth', webhookNode({ authentication: 'basicAuth' })],
		['the node is disabled', webhookNode({ disabled: true })],
	])('should not resolve when %s', async (_, node) => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, node);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should stop resolving as soon as the registration is removed', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, webhookNode());

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(200);

		await registrations.deregister(registrations.toKey({ httpMethod: 'POST', path: webhookPath }));

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(404);
	});
});

describe('method disambiguation', () => {
	test('should resolve a non-POST webhook, encoding the method in the resource', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, webhookNode(), { methods: ['GET'] });

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		expect(response.body.resource).toBe(resourceUrlFor(webhookPath, 'GET'));
	});

	test('should accept every method of a multi-method trigger as one audience set', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, webhookNode(), { methods: ['GET', 'POST'] });

		const viaGet = await resolveResource(webhookPath, 'GET');
		const viaPost = await resolveResource(webhookPath, 'POST');

		expect(viaGet?.id).toBe(viaPost?.id);
		const expectedAudiences = [
			resourceUrlFor(webhookPath, 'GET'),
			resourceUrlFor(webhookPath, 'POST'),
		];
		expect(viaGet?.getAudiences()).toEqual(expectedAudiences);
		expect(viaPost?.getAudiences()).toEqual(expectedAudiences);
	});

	test('should resolve disjoint-method triggers on a shared path', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, webhookNode({ name: 'GetHook' }), { methods: ['GET'] });
		await registerTestWebhook(webhookPath, webhookNode({ name: 'PostHook' }), {
			methods: ['POST'],
		});

		const getResponse = await testServer.restlessAgent.get(prmPathFor(webhookPath, 'GET'));
		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.body.resource).toBe(resourceUrlFor(webhookPath, 'GET'));

		const postResponse = await testServer.restlessAgent.get(prmPathFor(webhookPath, 'POST'));
		expect(postResponse.statusCode).toBe(200);
		expect(postResponse.body.resource).toBe(resourceUrlFor(webhookPath, 'POST'));
	});

	test('should refuse a shared path probed without a ?method selector', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, webhookNode({ name: 'GetHook' }), { methods: ['GET'] });
		await registerTestWebhook(webhookPath, webhookNode({ name: 'PostHook' }), {
			methods: ['POST'],
		});

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a method no trigger listens on', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, webhookNode(), { methods: ['GET'] });

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath, 'PUT'));

		expect(response.statusCode).toBe(404);
	});
});

describe('dynamic webhooks', () => {
	// `n8n-nodes-base.webhook` uses `isFullPath: true`, so `IWebhookData.path` on the
	// registration is the raw configured template (`user/:id`, no `webhookId` prefix) —
	// see `webhookResourcePath`. The served/resolved URL still carries the prefix.
	test('should resolve a concrete request path to the templated resource identity', async () => {
		const webhookId = randomUUID();
		await registerTestWebhook('user/:id', webhookNode(), { webhookId });

		const response = await testServer.restlessAgent.get(prmPathFor(`${webhookId}/user/42`));

		expect(response.statusCode).toBe(200);
		expect(response.body.resource).toBe(resourceUrlFor(`${webhookId}/user/:id`));
	});

	test('should resolve the templated request path to the same identity', async () => {
		const webhookId = randomUUID();
		await registerTestWebhook('user/:id', webhookNode(), { webhookId });

		const response = await testServer.restlessAgent.get(prmPathFor(`${webhookId}/user/:id`));

		expect(response.statusCode).toBe(200);
		expect(response.body.resource).toBe(resourceUrlFor(`${webhookId}/user/:id`));
	});

	test('should cover a multi-method dynamic trigger with one resource', async () => {
		const webhookId = randomUUID();
		await registerTestWebhook('user/:id', webhookNode(), {
			webhookId,
			methods: ['GET', 'POST'],
		});

		const response = await testServer.restlessAgent.get(prmPathFor(`${webhookId}/user/99`, 'POST'));

		expect(response.statusCode).toBe(200);
		expect(response.body.resource).toBe(resourceUrlFor(`${webhookId}/user/:id`, 'POST'));
	});
});

describe('test vs production resources', () => {
	test('should serve the same trigger path as two distinct resources', async () => {
		const webhookPath = randomUUID();
		const node = webhookNode();

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
			`/.well-known/oauth-protected-resource/${webhookEndpoint}/${webhookPath}?method=POST`,
		);
		const test = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(production.statusCode).toBe(200);
		expect(test.statusCode).toBe(200);
		expect(production.body.resource).not.toBe(test.body.resource);
	});

	test('should reject a test-resource token at the production resource and vice versa', async () => {
		const webhookPath = randomUUID();
		const node = webhookNode();

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
		const productionResourceUrl = `${webhookBaseUrl()}/${webhookEndpoint}/${webhookPath}?method=POST`;
		const testResourceUrl = resourceUrlFor(webhookPath);

		const testToken = tokenService.generateTokenPair(owner.id, clientId, testResourceUrl, []);
		await tokenService.saveTokenPair(
			testToken.accessToken,
			testToken.refreshToken,
			clientId,
			owner.id,
			[],
		);
		const productionToken = tokenService.generateTokenPair(
			owner.id,
			clientId,
			productionResourceUrl,
			[],
		);
		await tokenService.saveTokenPair(
			productionToken.accessToken,
			productionToken.refreshToken,
			clientId,
			owner.id,
			[],
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

describe('authorize gate (workflow:execute)', () => {
	/** A saved (but not activated/published) workflow — a realistic "testing a draft" state. */
	const createDraftWorkflow = async (node: INode, ownedBy: User = owner) =>
		await createWorkflowWithHistory({ active: false, nodes: [node] }, ownedBy);

	test('authorizes the owner but denies a user without execute access', async () => {
		const webhookPath = randomUUID();
		const node = webhookNode();
		const workflow = await createDraftWorkflow(node);
		await registerTestWebhook(webhookPath, node, { workflowId: workflow.id });

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(owner)).resolves.toBe(true);
		await expect(resource?.authorize(member)).resolves.toBe(false);
	});

	test('authorizes a user granted execute via a project role', async () => {
		const webhookPath = randomUUID();
		const node = webhookNode();
		const workflow = await createDraftWorkflow(node);
		await shareWorkflowWithUsers(workflow, [member]);
		await registerTestWebhook(webhookPath, node, { workflowId: workflow.id });

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});

	test('authorizes any authenticated user when require-execute is turned off', async () => {
		const webhookPath = randomUUID();
		const node = webhookNode({ requireExecuteAccess: false });
		const workflow = await createDraftWorkflow(node);
		await registerTestWebhook(webhookPath, node, { workflowId: workflow.id });

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});
});
