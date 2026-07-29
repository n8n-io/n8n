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
import type { IHttpRequestMethods, INode } from 'n8n-workflow';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let member: User;
let webhookEndpoint: string;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const resourceUrlFor = (webhookPath: string) =>
	`${webhookBaseUrl()}/${webhookEndpoint}/${webhookPath}`;
const prmPathFor = (webhookPath: string) =>
	`/.well-known/oauth-protected-resource/${webhookEndpoint}/${webhookPath}`;

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

/** Mirrors what `ActiveWorkflowManager.addWebhooks` persists on activation. */
const insertWebhookRow = async (
	workflowId: string,
	webhookPath: string,
	node: string,
	method: IHttpRequestMethods = 'POST',
) => {
	await Container.get(WebhookRepository).insert({ workflowId, webhookPath, method, node });
};

/** Active workflow whose published version contains the given trigger node. */
const createPublishedWebhookWorkflow = async (
	webhookPath: string,
	node: INode,
	{ methods = ['POST'], ownedBy = owner }: { methods?: IHttpRequestMethods[]; ownedBy?: User } = {},
) => {
	const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, ownedBy);
	await setActiveVersion(workflow.id, workflow.versionId);
	for (const method of methods) {
		await insertWebhookRow(workflow.id, webhookPath, node.name, method);
	}
	return workflow;
};

/** Overwrite the draft nodes without touching the published (active) version. */
const updateDraftNodes = async (workflowId: string, nodes: INode[]) => {
	await Container.get(WorkflowRepository).update(workflowId, { nodes, versionId: randomUUID() });
};

const resolveResource = async (webhookPath: string) =>
	await Container.get(ProtectedResourceRegistry).getByResourcePath(
		`/${webhookEndpoint}/${webhookPath}`,
	);

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

const decodeJwtPayload = (token: string): Record<string, unknown> =>
	JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<string, unknown>;

beforeAll(async () => {
	process.env.N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS = 'true'; // gates the webhook-trigger resolver
	owner = await createOwner();
	member = await createMember();
	webhookEndpoint = Container.get(GlobalConfig).endpoints.webhook;
});

afterAll(() => {
	delete process.env.N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS;
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

describe('protected resource metadata for webhook triggers', () => {
	test('should serve the metadata document for an active n8nOAuth2 webhook trigger', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode());

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		// exact match: `scopes_supported` must be absent (the resource advertises no scopes)
		expect(response.body).toEqual({
			resource: resourceUrlFor(webhookPath),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
		});
	});

	test('should resolve a non-POST webhook (method is not part of the resource)', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode(), { methods: ['GET'] });

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		expect(response.body.resource).toBe(resourceUrlFor(webhookPath));
	});

	test('should resolve a webhook registered under multiple methods', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode(), { methods: ['GET', 'POST'] });

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		expect(response.body.resource).toBe(resourceUrlFor(webhookPath));
	});

	test('should not resolve when the path is shared by triggers in different workflows', async () => {
		// n8n only enforces path uniqueness per (path, method), so two workflows can
		// register the same path under disjoint methods. The resource URL (path-only)
		// would then be ambiguous, so the resolver must refuse rather than pick one.
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode(), { methods: ['GET'] });
		await createPublishedWebhookWorkflow(webhookPath, webhookNode(), { methods: ['POST'] });

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should resolve as a non-first-party resource (arbitrary OAuth clients)', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode());

		const resource = await resolveResource(webhookPath);

		// Unlike the form trigger, a webhook is called by external clients, so it is
		// not first-party and imposes no redirect-URI restriction of its own.
		expect(resource?.isFirstParty).toBeUndefined();
		expect(resource?.getAllowedRedirectUris).toBeUndefined();
		expect(resource?.getResourceUrl()).toBe(resourceUrlFor(webhookPath));
		expect(resource?.getAudiences()).toEqual([resourceUrlFor(webhookPath)]);
	});

	test('should expose the workflow name for the consent screen', async () => {
		const webhookPath = randomUUID();
		const workflow = await createPublishedWebhookWorkflow(webhookPath, webhookNode());

		const resource = await resolveResource(webhookPath);

		expect(resource?.displayName).toBe(workflow.name);
	});

	test('should not resolve an unknown path', async () => {
		const response = await testServer.restlessAgent.get(prmPathFor(randomUUID()));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the feature flag is disabled', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode());

		delete process.env.N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS;
		try {
			const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));
			expect(response.statusCode).toBe(404);
		} finally {
			process.env.N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS = 'true';
		}
	});

	test('should not resolve a non-webhook path even if the webhook exists', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode());

		const response = await testServer.restlessAgent.get(
			`/.well-known/oauth-protected-resource/mcp/${webhookPath}`,
		);

		expect(response.statusCode).toBe(404);
	});

	test.each([
		['authentication is none', webhookNode({ authentication: 'none' })],
		['authentication is basicAuth', webhookNode({ authentication: 'basicAuth' })],
		['authentication is headerAuth', webhookNode({ authentication: 'headerAuth' })],
		['authentication is jwtAuth', webhookNode({ authentication: 'jwtAuth' })],
		['authentication is an expression', webhookNode({ authentication: '={{ $json.auth }}' })],
		['the node is disabled', webhookNode({ disabled: true })],
	])('should not resolve when %s', async (_, node) => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, node);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a workflow without a published version', async () => {
		const node = webhookNode();
		const webhookPath = randomUUID();
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await insertWebhookRow(workflow.id, webhookPath, node.name);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the webhook node is missing from the active version', async () => {
		const node = webhookNode();
		const webhookPath = randomUUID();
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await insertWebhookRow(workflow.id, webhookPath, 'Ghost node');

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a dynamic webhook path', async () => {
		const node = webhookNode();
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
		const protectedWorkflow = await createPublishedWebhookWorkflow(protectedPath, webhookNode());
		await updateDraftNodes(protectedWorkflow.id, [webhookNode({ authentication: 'none' })]);

		const stillProtected = await testServer.restlessAgent.get(prmPathFor(protectedPath));
		expect(stillProtected.statusCode).toBe(200);
		expect(stillProtected.body.resource).toBe(resourceUrlFor(protectedPath));

		// published none, draft switched to n8nOAuth2 -> no resource
		const unprotectedPath = randomUUID();
		const unprotectedWorkflow = await createPublishedWebhookWorkflow(
			unprotectedPath,
			webhookNode({ authentication: 'none' }),
		);
		await updateDraftNodes(unprotectedWorkflow.id, [webhookNode()]);

		const stillUnprotected = await testServer.restlessAgent.get(prmPathFor(unprotectedPath));
		expect(stillUnprotected.statusCode).toBe(404);
	});

	test('should stop resolving once the webhook is deregistered', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode());

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(200);

		await Container.get(WebhookRepository).delete({ webhookPath });
		await Container.get(CacheService).reset();

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(404);
	});
});

describe('authorize gate (workflow:execute)', () => {
	test('authorizes the owner but denies a user without execute access', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode());

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(owner)).resolves.toBe(true);
		await expect(resource?.authorize(member)).resolves.toBe(false);
	});

	test('authorizes a user granted execute via a project role', async () => {
		const webhookPath = randomUUID();
		const workflow = await createPublishedWebhookWorkflow(webhookPath, webhookNode());
		await shareWorkflowWithUsers(workflow, [member]);

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});

	test('authorizes any authenticated user when require-execute is turned off', async () => {
		const webhookPath = randomUUID();
		await createPublishedWebhookWorkflow(webhookPath, webhookNode({ requireExecuteAccess: false }));

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});
});

describe('token audience', () => {
	test('should mint tokens whose audience is the trigger URL and reject cross-resource use', async () => {
		const pathA = randomUUID();
		const pathB = randomUUID();
		await createPublishedWebhookWorkflow(pathA, webhookNode());
		await createPublishedWebhookWorkflow(pathB, webhookNode());
		const tokenService = Container.get(OAuthTokenService);
		const clientId = await registerOAuthClient();

		const { accessToken, refreshToken } = tokenService.generateTokenPair(
			owner.id,
			clientId,
			resourceUrlFor(pathA),
			[],
		);
		await tokenService.saveTokenPair(accessToken, refreshToken, clientId, owner.id, []);

		expect(decodeJwtPayload(accessToken).aud).toBe(resourceUrlFor(pathA));

		await expect(
			tokenService.verifyAccessToken(accessToken, resourceUrlFor(pathA)),
		).resolves.toMatchObject({ clientId });

		// a token minted for webhook A must fail webhook B's audience gate
		await expect(
			tokenService.verifyAccessToken(accessToken, resourceUrlFor(pathB)),
		).rejects.toThrow();
	});
});
