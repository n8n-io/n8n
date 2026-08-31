import {
	createWorkflowWithHistory,
	setActiveVersion,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE, CHAT_TRIGGER_PATH_SUFFIX, WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createMember, createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let member: User;
let webhookEndpoint: string;

/** The path a chat trigger registers under: `{webhookId}/chat`. */
const chatPath = () => `${randomUUID()}/${CHAT_TRIGGER_PATH_SUFFIX}`;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const resourceUrlFor = (path: string) => `${webhookBaseUrl()}/${webhookEndpoint}/${path}`;
const prmPathFor = (path: string) =>
	`/.well-known/oauth-protected-resource/${webhookEndpoint}/${path}`;

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

/** Mirrors the two rows `ActiveWorkflowManager.addWebhooks` persists for a chat trigger. */
const insertWebhookRows = async (workflowId: string, path: string, node: string) => {
	await Container.get(WebhookRepository).insert([
		{ workflowId, webhookPath: path, method: 'GET', node },
		{ workflowId, webhookPath: path, method: 'POST', node },
	]);
};

/** Active workflow whose published version contains the given trigger node. */
const createPublishedChatWorkflow = async (path: string, node: INode, ownedBy = owner) => {
	const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, ownedBy);
	await setActiveVersion(workflow.id, workflow.versionId);
	await insertWebhookRows(workflow.id, path, node.name);
	return workflow;
};

/** Overwrite the draft nodes without touching the published (active) version. */
const updateDraftNodes = async (workflowId: string, nodes: INode[]) => {
	await Container.get(WorkflowRepository).update(workflowId, { nodes, versionId: randomUUID() });
};

const resolveResource = async (path: string) =>
	await Container.get(ProtectedResourceRegistry).getByResourcePath(`/${webhookEndpoint}/${path}`);

beforeAll(async () => {
	process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2 = 'true'; // gates the chat-trigger resolver
	owner = await createOwner();
	member = await createMember();
	webhookEndpoint = Container.get(GlobalConfig).endpoints.webhook;
});

afterAll(() => {
	delete process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2;
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

describe('protected resource metadata for chat triggers', () => {
	test('should serve the metadata document for an active n8nUserAuth hosted chat trigger', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode());

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(200);
		// exact match: `scopes_supported` must be absent (the resource advertises no scopes)
		expect(response.body).toEqual({
			resource: resourceUrlFor(path),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
		});
	});

	test('should resolve as a first-party resource whose only redirect URI is the chat page URL', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode());

		const resource = await resolveResource(path);

		expect(resource?.isFirstParty).toBe(true);
		expect(resource?.getResourceUrl()).toBe(resourceUrlFor(path));
		await expect(resource?.getAllowedRedirectUris?.()).resolves.toEqual([resourceUrlFor(path)]);
	});

	test('should expose the workflow name for the consent screen', async () => {
		const path = chatPath();
		const workflow = await createPublishedChatWorkflow(path, chatTriggerNode());

		const resource = await resolveResource(path);

		expect(resource?.displayName).toBe(workflow.name);
	});

	test('should resolve when mode is absent, defaulting to hostedChat', async () => {
		// The editor strips a parameter left at its default, so a saved hosted chat
		// trigger may carry no `mode` key at all.
		const node = chatTriggerNode({ mode: null });
		expect(node.parameters.mode).toBeUndefined();
		const path = chatPath();
		await createPublishedChatWorkflow(path, node);

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(200);
		expect(response.body.resource).toBe(resourceUrlFor(path));
	});

	test('should resolve when mode is explicitly hostedChat', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode({ mode: 'hostedChat' }));

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(200);
	});

	test('should not resolve an unknown path', async () => {
		const response = await testServer.restlessAgent.get(prmPathFor(chatPath()));

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
		await createPublishedChatWorkflow(path, node);

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the feature flag is disabled', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode());

		delete process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2;
		try {
			// Also proves the generic webhook resolver does not pick a chat path up itself.
			const response = await testServer.restlessAgent.get(prmPathFor(path));
			expect(response.statusCode).toBe(404);
		} finally {
			process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2 = 'true';
		}
	});

	test('should not resolve when public chat is disabled instance-wide', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode());
		const config = Container.get(GlobalConfig);

		config.chatTrigger.disablePublicChat = true;
		try {
			// The node serves a 404 for the page, so advertising a resource for it is wrong.
			const response = await testServer.restlessAgent.get(prmPathFor(path));
			expect(response.statusCode).toBe(404);
		} finally {
			config.chatTrigger.disablePublicChat = false;
		}
	});

	test('should not resolve a workflow without a published version', async () => {
		const node = chatTriggerNode();
		const path = chatPath();
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await insertWebhookRows(workflow.id, path, node.name);

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the webhook node is missing from the active version', async () => {
		const node = chatTriggerNode();
		const path = chatPath();
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await insertWebhookRows(workflow.id, path, 'Ghost node');

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(404);
	});

	test('should stop resolving once the webhook is deregistered', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode());

		expect((await testServer.restlessAgent.get(prmPathFor(path))).statusCode).toBe(200);

		await Container.get(WebhookRepository).delete({ webhookPath: path });
		await Container.get(CacheService).reset();

		expect((await testServer.restlessAgent.get(prmPathFor(path))).statusCode).toBe(404);
	});

	test('should follow the published version, not the draft', async () => {
		// published n8nUserAuth, draft switched to none -> resource stays
		const protectedPath = chatPath();
		const protectedWorkflow = await createPublishedChatWorkflow(protectedPath, chatTriggerNode());
		await updateDraftNodes(protectedWorkflow.id, [chatTriggerNode({ authentication: 'none' })]);

		const stillProtected = await testServer.restlessAgent.get(prmPathFor(protectedPath));
		expect(stillProtected.statusCode).toBe(200);
		expect(stillProtected.body.resource).toBe(resourceUrlFor(protectedPath));

		// published none, draft switched to n8nUserAuth -> no resource
		const unprotectedPath = chatPath();
		const unprotectedWorkflow = await createPublishedChatWorkflow(
			unprotectedPath,
			chatTriggerNode({ authentication: 'none' }),
		);
		await updateDraftNodes(unprotectedWorkflow.id, [chatTriggerNode()]);

		const stillUnprotected = await testServer.restlessAgent.get(prmPathFor(unprotectedPath));
		expect(stillUnprotected.statusCode).toBe(404);
	});

	test('should not resolve a generic Webhook node whose path happens to end in /chat', async () => {
		const path = chatPath();
		const node: INode = {
			id: randomUUID(),
			name: 'Webhook',
			type: WEBHOOK_NODE_TYPE,
			typeVersion: 2,
			position: [0, 0],
			parameters: { path, httpMethod: 'GET', authentication: 'none' },
		};
		await createPublishedChatWorkflow(path, node);

		const response = await testServer.restlessAgent.get(prmPathFor(path));

		expect(response.statusCode).toBe(404);
	});
});

describe('authorize gate (workflow:execute)', () => {
	test('authorizes the owner but denies a visitor without execute access', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode({ requireExecuteAccess: true }));

		const resource = await resolveResource(path);

		await expect(resource?.authorize(owner)).resolves.toBe(true);
		await expect(resource?.authorize(member)).resolves.toBe(false);
	});

	test('authorizes a visitor granted execute via a project role', async () => {
		const path = chatPath();
		const workflow = await createPublishedChatWorkflow(
			path,
			chatTriggerNode({ requireExecuteAccess: true }),
		);
		await shareWorkflowWithUsers(workflow, [member]);

		const resource = await resolveResource(path);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});

	test('authorizes any authenticated visitor when require-execute is turned off', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode({ requireExecuteAccess: false }));

		const resource = await resolveResource(path);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});

	test('authorizes any authenticated visitor when the parameter is absent', async () => {
		// `requireExecuteAccess` is opt-in, so an unset parameter means any authenticated
		// visitor may chat — a trigger whose node never set it stays open.
		const node = chatTriggerNode();
		expect(node.parameters.requireExecuteAccess).toBeUndefined();
		const path = chatPath();
		await createPublishedChatWorkflow(path, node);

		const resource = await resolveResource(path);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});
});

/**
 * The same check the chat POST handler and dynamic-credential resolution go through:
 * holding a token for the chat resource is not enough — the visitor must still have
 * `workflow:execute` on the workflow behind it.
 */
describe('runtime gate: verifyOAuthAccessToken enforces workflow:execute', () => {
	const mintAccessToken = async (userId: string, resourceUrl: string) => {
		const tokenService = Container.get(OAuthTokenService);
		// A registered client is needed only to satisfy the token rows' FK.
		const clientId = `client-${randomUUID()}`;
		await Container.get(OAuthClientRepository).save({
			id: clientId,
			name: 'Chat resolver tests',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});
		const pair = tokenService.generateTokenPair(userId, clientId, resourceUrl, []);
		await tokenService.saveTokenPair(
			pair.accessToken,
			pair.refreshToken,
			clientId,
			userId,
			[],
			pair.audience,
		);
		return pair.accessToken;
	};

	test('refuses a visitor without execute access on the workflow', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode({ requireExecuteAccess: true }));
		const token = await mintAccessToken(member.id, resourceUrlFor(path));

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlFor(path),
		);

		expect(result.user).toBeNull();
		expect(result.context?.reason).toBe('insufficient_scope');
	});

	test('allows a visitor granted execute via a project role', async () => {
		const path = chatPath();
		const workflow = await createPublishedChatWorkflow(
			path,
			chatTriggerNode({ requireExecuteAccess: true }),
		);
		await shareWorkflowWithUsers(workflow, [member]);
		const token = await mintAccessToken(member.id, resourceUrlFor(path));

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlFor(path),
		);

		expect(result.user?.id).toBe(member.id);
	});

	test('allows the same visitor once require-execute is turned off', async () => {
		const path = chatPath();
		await createPublishedChatWorkflow(path, chatTriggerNode({ requireExecuteAccess: false }));
		const token = await mintAccessToken(member.id, resourceUrlFor(path));

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlFor(path),
		);

		expect(result.user?.id).toBe(member.id);
	});
});
