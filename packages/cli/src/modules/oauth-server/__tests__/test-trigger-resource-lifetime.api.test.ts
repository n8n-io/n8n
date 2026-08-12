import { createWorkflowWithHistory, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { IHttpRequestMethods, INode, IWebhookData, IWorkflowBase } from 'n8n-workflow';
import { toCredentialContext, WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthClientRepository } from '@/modules/oauth-server/database/repositories/oauth-client.repository';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';

/**
 * A run re-verifies its token on every dynamic-credential access, and outlives the
 * resource descriptor that gate reads. These tests pin that the sealed grant keeps the
 * gate working once the resource is gone, without becoming a way around it.
 */
setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let member: User;
let webhookTestEndpoint: string;
let registrations: TestWebhookRegistrationsService;
let clientId: string;

const testWebhookBaseUrl = () =>
	Container.get(UrlService).getTestWebhookBaseUrl().replace(/\/$/, '');

const resourceUrlFor = (webhookPath: string, method: IHttpRequestMethods = 'POST') =>
	`${testWebhookBaseUrl()}/${webhookTestEndpoint}/${webhookPath}?method=${method}`;

const oauth2WebhookNode = (requireExecuteAccess?: boolean): INode => ({
	id: randomUUID(),
	name: 'Webhook',
	type: WEBHOOK_NODE_TYPE,
	typeVersion: 2.1,
	position: [0, 0],
	parameters: {
		path: 'unused',
		httpMethod: 'POST',
		authentication: 'n8nOAuth2',
		...(requireExecuteAccess === undefined ? {} : { requireExecuteAccess }),
	},
});

/** Mirrors what `TestWebhooks.needsWebhook` writes when the editor starts listening. */
const registerTestWebhook = async (
	webhookPath: string,
	node: INode,
	workflow: { id: string; name: string },
	methods: IHttpRequestMethods[] = ['POST'],
) => {
	for (const httpMethod of methods) {
		await registrations.register({
			version: 1,
			workflowEntity: {
				id: workflow.id,
				name: workflow.name,
				active: false,
				nodes: [node],
				connections: {},
			} as IWorkflowBase,
			webhook: {
				httpMethod,
				path: webhookPath,
				node: node.name,
				workflowId: workflow.id,
			} as IWebhookData,
		});
	}
};

const mintTokenFor = async (resourceUrl: string, user: User) => {
	const tokenService = Container.get(OAuthTokenService);
	const pair = tokenService.generateTokenPair(user.id, clientId, resourceUrl, []);
	await tokenService.saveTokenPair(pair.accessToken, pair.refreshToken, clientId, user.id, []);
	return pair.accessToken;
};

/**
 * The grant as the run sees it — round-tripped through the encrypted context, so the
 * cipher and metadata schema are covered. Mirrors `establishTriggerIdentity`.
 */
const sealAndReadBackGrant = async (resourceUrl: string) => {
	const resource = await Container.get(ProtectedResourceRegistry).getByResourceUrl(resourceUrl);
	const grant = resource?.getGrant?.();

	const sealed = await Container.get(Cipher).encryptV2({
		version: 1,
		identity: 'unused',
		metadata: { source: 'n8n-oauth', resource: resourceUrl, ...(grant ? { grant } : {}) },
	});

	const context = toCredentialContext(await Container.get(Cipher).decryptV2(sealed));
	return (context.metadata as { grant?: { audiences: string[]; executeAccessWorkflowId?: string } })
		.grant;
};

/** Teardown of the registration, as `TestWebhooks.executeWebhook` performs it. */
const deregisterTrigger = async (
	webhookPath: string,
	methods: IHttpRequestMethods[] = ['POST'],
) => {
	for (const httpMethod of methods) {
		await registrations.deregister(registrations.toKey({ httpMethod, path: webhookPath }));
	}
};

beforeAll(async () => {
	process.env.N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS = 'true';
	owner = await createOwner();
	member = await createMember();
	webhookTestEndpoint = Container.get(GlobalConfig).endpoints.webhookTest;
	registrations = Container.get(TestWebhookRegistrationsService);

	clientId = randomUUID();
	await Container.get(OAuthClientRepository).insert({
		id: clientId,
		name: 'resource-lifetime-tests',
		redirectUris: ['https://example.com/callback'],
		grantTypes: ['authorization_code'],
	});
});

afterAll(() => {
	delete process.env.N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS;
});

afterEach(async () => {
	await Container.get(CacheService).reset();
	await testDb.truncate([
		'AccessToken',
		'RefreshToken',
		'WebhookEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
	]);
});

describe('protected-resource grants outliving the trigger', () => {
	test('keeps verifying the run token after the registration is torn down', async () => {
		const webhookPath = randomUUID();
		const node = oauth2WebhookNode();
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await registerTestWebhook(webhookPath, node, workflow);

		const resourceUrl = resourceUrlFor(webhookPath);
		const token = await mintTokenFor(resourceUrl, owner);
		const tokenService = Container.get(OAuthTokenService);

		// The gate the triggering request itself passes.
		await expect(tokenService.verifyOAuthAccessToken(token, resourceUrl)).resolves.toMatchObject({
			user: expect.objectContaining({ id: owner.id }),
		});

		const grant = await sealAndReadBackGrant(resourceUrl);
		await deregisterTrigger(webhookPath);

		// Without a grant the gate fails closed once the resource stops resolving.
		await expect(tokenService.verifyOAuthAccessToken(token, resourceUrl)).resolves.toMatchObject({
			user: null,
			context: expect.objectContaining({ reason: 'insufficient_scope' }),
		});

		// The check the run makes for every dynamic credential it touches, however late.
		await expect(
			tokenService.verifyOAuthAccessToken(token, resourceUrl, grant),
		).resolves.toMatchObject({ user: expect.objectContaining({ id: owner.id }) });
	});

	test('covers every method of a multi-method trigger', async () => {
		const webhookPath = randomUUID();
		const node = oauth2WebhookNode();
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await registerTestWebhook(webhookPath, node, workflow, ['GET', 'POST']);

		const resourceUrl = resourceUrlFor(webhookPath, 'POST');
		const grant = await sealAndReadBackGrant(resourceUrl);
		const token = await mintTokenFor(resourceUrlFor(webhookPath, 'GET'), owner);

		// The sealed audiences are the ones the live resource serves, so what a token is
		// checked against doesn't shift when the resource stops resolving.
		const live = await Container.get(ProtectedResourceRegistry).getByResourceUrl(resourceUrl);
		expect(grant?.audiences).toEqual(live?.getAudiences());

		await deregisterTrigger(webhookPath, ['GET', 'POST']);

		await expect(
			Container.get(OAuthTokenService).verifyOAuthAccessToken(token, resourceUrl, grant),
		).resolves.toMatchObject({ user: expect.objectContaining({ id: owner.id }) });
	});

	describe('does not widen what the resource allowed', () => {
		test('re-checks execute access, so revoking it stops the run', async () => {
			const webhookPath = randomUUID();
			const node = oauth2WebhookNode();
			const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
			await registerTestWebhook(webhookPath, node, workflow);

			const resourceUrl = resourceUrlFor(webhookPath);
			// `member` has no execute access, so the grant's live check must reject them.
			const token = await mintTokenFor(resourceUrl, member);
			const grant = await sealAndReadBackGrant(resourceUrl);
			await deregisterTrigger(webhookPath);

			await expect(
				Container.get(OAuthTokenService).verifyOAuthAccessToken(token, resourceUrl, grant),
			).resolves.toMatchObject({
				user: null,
				context: expect.objectContaining({ reason: 'insufficient_scope' }),
			});
		});

		test('rejects a token minted for a different resource', async () => {
			const webhookPath = randomUUID();
			const otherPath = randomUUID();
			const node = oauth2WebhookNode();
			const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
			await registerTestWebhook(webhookPath, node, workflow);

			const grant = await sealAndReadBackGrant(resourceUrlFor(webhookPath));
			const foreignToken = await mintTokenFor(resourceUrlFor(otherPath), owner);
			await deregisterTrigger(webhookPath);

			await expect(
				Container.get(OAuthTokenService).verifyOAuthAccessToken(
					foreignToken,
					resourceUrlFor(webhookPath),
					grant,
				),
			).resolves.toMatchObject({ user: null });
		});

		test('stops at the sealed token expiring, which the grant does not extend', async () => {
			const webhookPath = randomUUID();
			const node = oauth2WebhookNode();
			const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
			await registerTestWebhook(webhookPath, node, workflow);

			const resourceUrl = resourceUrlFor(webhookPath);
			const token = await mintTokenFor(resourceUrl, owner);
			const grant = await sealAndReadBackGrant(resourceUrl);
			await deregisterTrigger(webhookPath);

			const tokenService = Container.get(OAuthTokenService);
			await expect(
				tokenService.verifyOAuthAccessToken(token, resourceUrl, grant),
			).resolves.toMatchObject({ user: expect.objectContaining({ id: owner.id }) });

			// This is the real ceiling on how long a run can keep resolving credentials: the
			// grant outlives the resource, but not the access token it was sealed with. A run
			// parked past `getAccessTokenExpirySeconds()` — a Wait node, a long queue backlog —
			// fails here, not at the resource lookup.
			vi.useFakeTimers();
			vi.setSystemTime(
				new Date(Date.now() + (tokenService.getAccessTokenExpirySeconds() + 60) * 1000),
			);
			try {
				await expect(
					tokenService.verifyOAuthAccessToken(token, resourceUrl, grant),
				).resolves.toMatchObject({
					user: null,
					context: expect.objectContaining({ reason: 'invalid_token' }),
				});
			} finally {
				vi.useRealTimers();
			}
		});

		test('rejects a revoked token', async () => {
			const webhookPath = randomUUID();
			const node = oauth2WebhookNode();
			const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
			await registerTestWebhook(webhookPath, node, workflow);

			const resourceUrl = resourceUrlFor(webhookPath);
			const token = await mintTokenFor(resourceUrl, owner);
			const grant = await sealAndReadBackGrant(resourceUrl);
			await deregisterTrigger(webhookPath);

			await testDb.truncate(['AccessToken']); // as `revokeAccessToken` would leave it

			await expect(
				Container.get(OAuthTokenService).verifyOAuthAccessToken(token, resourceUrl, grant),
			).resolves.toMatchObject({
				user: null,
				context: expect.objectContaining({ reason: 'token_not_found_in_db' }),
			});
		});
	});

	test('omits the execute check when the trigger does not require it', async () => {
		const webhookPath = randomUUID();
		const node = oauth2WebhookNode(false);
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await registerTestWebhook(webhookPath, node, workflow);

		const resourceUrl = resourceUrlFor(webhookPath);
		const token = await mintTokenFor(resourceUrl, member);
		const grant = await sealAndReadBackGrant(resourceUrl);
		await deregisterTrigger(webhookPath);

		expect(grant?.executeAccessWorkflowId).toBeUndefined();
		await expect(
			Container.get(OAuthTokenService).verifyOAuthAccessToken(token, resourceUrl, grant),
		).resolves.toMatchObject({ user: expect.objectContaining({ id: member.id }) });
	});

	test('prefers the live resource while the trigger is still registered', async () => {
		const webhookPath = randomUUID();
		const node = oauth2WebhookNode();
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await registerTestWebhook(webhookPath, node, workflow);

		const resourceUrl = resourceUrlFor(webhookPath);
		const token = await mintTokenFor(resourceUrl, member);

		// A grant naming no workflow would pass if it took precedence over the resource.
		await expect(
			Container.get(OAuthTokenService).verifyOAuthAccessToken(token, resourceUrl, {
				audiences: [resourceUrl],
			}),
		).resolves.toMatchObject({ user: null });
	});
});
