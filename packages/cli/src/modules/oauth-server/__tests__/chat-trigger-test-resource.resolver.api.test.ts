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
import type { INode, IWebhookData, IWorkflowBase } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE, CHAT_TRIGGER_PATH_SUFFIX } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createMember, createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';

import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let member: User;
let webhookEndpoint: string;
let webhookTestEndpoint: string;
let registrations: TestWebhookRegistrationsService;

/** The path a chat trigger registers under: `{webhookId}/chat`. */
const chatPath = () => `${randomUUID()}/${CHAT_TRIGGER_PATH_SUFFIX}`;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const testWebhookBaseUrl = () =>
	Container.get(UrlService).getTestWebhookBaseUrl().replace(/\/$/, '');
const testResourceUrlFor = (path: string) =>
	`${testWebhookBaseUrl()}/${webhookTestEndpoint}/${path}`;
const prmPathFor = (path: string) =>
	`/.well-known/oauth-protected-resource/${webhookTestEndpoint}/${path}`;

const chatTriggerNode = ({
	name = 'When chat message received',
	public: isPublic = true,
	mode = 'hostedChat',
	authentication = 'n8nUserAuth',
	disabled = false,
	requireExecuteAccess,
}: {
	name?: string;
	// `null` drops the key entirely, so the "parameter stripped at its default" shape the
	// editor actually saves is exercised too; `undefined` keeps the default value.
	public?: boolean | null;
	mode?: string | null;
	authentication?: string | null;
	disabled?: boolean;
	requireExecuteAccess?: boolean;
} = {}): INode => ({
	id: randomUUID(),
	name,
	type: CHAT_TRIGGER_NODE_TYPE,
	typeVersion: 1.3,
	position: [0, 0],
	disabled,
	webhookId: randomUUID(),
	parameters: {
		...(isPublic === null ? {} : { public: isPublic }),
		...(mode === null ? {} : { mode }),
		...(authentication === null ? {} : { authentication }),
		...(requireExecuteAccess === undefined ? {} : { requireExecuteAccess }),
	},
});

/** Mirrors what `TestWebhooks.needsWebhook` registers when the user tests a chat trigger. */
const registerTestWebhook = async (
	path: string,
	node: INode,
	{
		workflowId = randomUUID(),
		workflowName = 'My test workflow',
		nodeName = node.name,
	}: { workflowId?: string; workflowName?: string; nodeName?: string } = {},
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
			httpMethod: 'GET',
			path,
			node: nodeName,
			workflowId,
		} as IWebhookData,
	});
	return { workflowId, workflowName };
};

const resolveResource = async (path: string) =>
	await Container.get(ProtectedResourceRegistry).getByResourcePath(
		`/${webhookTestEndpoint}/${path}`,
	);

beforeAll(async () => {
	process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2 = 'true'; // gates the chat-trigger resolver
	owner = await createOwner();
	member = await createMember();
	const { endpoints } = Container.get(GlobalConfig);
	webhookEndpoint = endpoints.webhook;
	webhookTestEndpoint = endpoints.webhookTest;
	registrations = Container.get(TestWebhookRegistrationsService);
});

afterAll(() => {
	delete process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2;
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

describe('protected resource metadata for test chat triggers', () => {
	test('should serve the metadata document while a test registration exists', async () => {
		const path = chatPath();
		await registerTestWebhook(path, chatTriggerNode());

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			resource: testResourceUrlFor(path),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
		});
	});

	test('should resolve as a first-party resource whose only redirect URI is the chat page URL', async () => {
		const path = chatPath();
		await registerTestWebhook(path, chatTriggerNode());

		const resource = await resolveResource(path);

		expect(resource?.isFirstParty).toBe(true);
		expect(resource?.getResourceUrl()).toBe(testResourceUrlFor(path));
		await expect(resource?.getAllowedRedirectUris?.()).resolves.toEqual([testResourceUrlFor(path)]);
	});

	test('should resolve from the registration alone, without the workflow in the DB', async () => {
		const path = chatPath();
		await registerTestWebhook(path, chatTriggerNode(), { workflowName: 'Unsaved workflow' });

		const resource = await resolveResource(path);

		expect(resource?.displayName).toBe('Unsaved workflow');
	});

	test('should resolve when mode is absent, defaulting to hostedChat', async () => {
		const node = chatTriggerNode({ mode: null });
		expect(node.parameters.mode).toBeUndefined();
		const path = chatPath();
		await registerTestWebhook(path, node);

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(200);
	});

	test('should not resolve an unknown test path', async () => {
		const response = await testServer.restlessAgent.get(prmPathFor(chatPath()));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the registration node name does not match', async () => {
		const path = chatPath();
		await registerTestWebhook(path, chatTriggerNode(), { nodeName: 'Ghost node' });

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(404);
	});

	test.each([
		['the chat is not public', chatTriggerNode({ public: false })],
		['the public parameter is absent', chatTriggerNode({ public: null })],
		['the chat is embedded rather than hosted', chatTriggerNode({ mode: 'webhook' })],
		['authentication is none', chatTriggerNode({ authentication: 'none' })],
		['authentication is basicAuth', chatTriggerNode({ authentication: 'basicAuth' })],
		['authentication is an expression', chatTriggerNode({ authentication: '={{ $json.auth }}' })],
		['the authentication parameter is absent', chatTriggerNode({ authentication: null })],
		['the node is disabled', chatTriggerNode({ disabled: true })],
	])('should not resolve when %s', async (_, node) => {
		const path = chatPath();
		await registerTestWebhook(path, node);

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the feature flag is disabled', async () => {
		const path = chatPath();
		await registerTestWebhook(path, chatTriggerNode());

		delete process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2;
		try {
			const response = await testServer.restlessAgent.get(prmPathFor(path));
			expect(response.statusCode).toBe(404);
		} finally {
			process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2 = 'true';
		}
	});

	test('should not resolve when public chat is disabled instance-wide', async () => {
		const path = chatPath();
		await registerTestWebhook(path, chatTriggerNode());
		const config = Container.get(GlobalConfig);

		config.chatTrigger.disablePublicChat = true;
		try {
			const response = await testServer.restlessAgent.get(prmPathFor(path));
			expect(response.statusCode).toBe(404);
		} finally {
			config.chatTrigger.disablePublicChat = false;
		}
	});

	test('should stop resolving as soon as the registration is removed', async () => {
		const path = chatPath();
		await registerTestWebhook(path, chatTriggerNode());

		expect((await testServer.restlessAgent.get(prmPathFor(path))).statusCode).toBe(200);

		await registrations.deregister(registrations.toKey({ httpMethod: 'GET', path }));

		expect((await testServer.restlessAgent.get(prmPathFor(path))).statusCode).toBe(404);
	});
});

describe('authorize gate (workflow:execute)', () => {
	const registerWithWorkflow = async (node: INode) => {
		const path = chatPath();
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await registerTestWebhook(path, node, { workflowId: workflow.id });
		return { path, workflow };
	};

	test('authorizes the owner but denies a visitor without execute access', async () => {
		const { path } = await registerWithWorkflow(chatTriggerNode({ requireExecuteAccess: true }));

		const resource = await resolveResource(path);

		await expect(resource?.authorize(owner)).resolves.toBe(true);
		await expect(resource?.authorize(member)).resolves.toBe(false);
	});

	test('authorizes a visitor granted execute via a project role', async () => {
		const { path, workflow } = await registerWithWorkflow(
			chatTriggerNode({ requireExecuteAccess: true }),
		);
		await shareWorkflowWithUsers(workflow, [member]);

		const resource = await resolveResource(path);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});

	test('authorizes any authenticated visitor when require-execute is turned off', async () => {
		const { path } = await registerWithWorkflow(chatTriggerNode({ requireExecuteAccess: false }));

		const resource = await resolveResource(path);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});

	test('authorizes any authenticated visitor when the parameter is absent', async () => {
		const node = chatTriggerNode();
		expect(node.parameters.requireExecuteAccess).toBeUndefined();
		const { path } = await registerWithWorkflow(node);

		const resource = await resolveResource(path);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});
});

describe('runtime gate: verifyOAuthAccessToken enforces workflow:execute', () => {
	const mintAccessToken = async (userId: string, resourceUrl: string) => {
		const tokenService = Container.get(OAuthTokenService);
		const clientId = `client-${randomUUID()}`;
		await Container.get(OAuthClientRepository).save({
			id: clientId,
			name: 'Chat test resolver tests',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});
		const pair = tokenService.generateTokenPair(userId, clientId, resourceUrl, []);
		await tokenService.saveTokenPair(pair.accessToken, pair.refreshToken, clientId, userId, []);
		return pair.accessToken;
	};

	test('refuses a visitor without execute access on the workflow', async () => {
		const path = chatPath();
		const node = chatTriggerNode({ requireExecuteAccess: true });
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await registerTestWebhook(path, node, { workflowId: workflow.id });
		const token = await mintAccessToken(member.id, testResourceUrlFor(path));

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			testResourceUrlFor(path),
		);

		expect(result.user).toBeNull();
		expect(result.context?.reason).toBe('insufficient_scope');
	});
});

describe('test vs production chat resources', () => {
	/** The same chat trigger, live both as a published webhook and as a test registration. */
	const createBothRegistrations = async () => {
		const path = chatPath();
		const node = chatTriggerNode();

		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await Container.get(WebhookRepository).insert([
			{ workflowId: workflow.id, webhookPath: path, method: 'GET', node: node.name },
			{ workflowId: workflow.id, webhookPath: path, method: 'POST', node: node.name },
		]);
		await registerTestWebhook(path, node, { workflowId: workflow.id });

		return path;
	};

	test('should serve the same trigger path as two distinct resources', async () => {
		const path = await createBothRegistrations();

		const production = await testServer.restlessAgent.get(
			`/.well-known/oauth-protected-resource/${webhookEndpoint}/${path}`,
		);
		const test = await testServer.restlessAgent.get(prmPathFor(path));

		expect(production.statusCode).toBe(200);
		expect(test.statusCode).toBe(200);
		expect(production.body.resource).not.toBe(test.body.resource);
	});

	test('should reject a test-resource token at the production resource and vice versa', async () => {
		const path = await createBothRegistrations();

		const tokenService = Container.get(OAuthTokenService);
		const productionResourceUrl = `${webhookBaseUrl()}/${webhookEndpoint}/${path}`;
		const testResourceUrl = testResourceUrlFor(path);

		// A registered client is needed only to satisfy the token rows' FK.
		const clientId = `client-${randomUUID()}`;
		await Container.get(OAuthClientRepository).save({
			id: clientId,
			name: 'Chat resolver tests',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		const mint = async (resourceUrl: string) => {
			const pair = tokenService.generateTokenPair(owner.id, clientId, resourceUrl, []);
			await tokenService.saveTokenPair(pair.accessToken, pair.refreshToken, clientId, owner.id, []);
			return pair.accessToken;
		};

		const testToken = await mint(testResourceUrl);
		const productionToken = await mint(productionResourceUrl);

		await expect(tokenService.verifyAccessToken(testToken, testResourceUrl)).resolves.toMatchObject(
			{ clientId },
		);
		await expect(
			tokenService.verifyAccessToken(productionToken, productionResourceUrl),
		).resolves.toMatchObject({ clientId });

		await expect(
			tokenService.verifyAccessToken(testToken, productionResourceUrl),
		).rejects.toThrow();
		await expect(
			tokenService.verifyAccessToken(productionToken, testResourceUrl),
		).rejects.toThrow();
	});
});
