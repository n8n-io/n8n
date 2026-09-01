import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_PATH_SUFFIX,
	FORM_TRIGGER_NODE_TYPE,
	UserError,
} from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';
import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { RefreshTokenRepository } from '../database/repositories/oauth-refresh-token.repository';
import { OAuthAuthorizationCodeService } from '../oauth-authorization-code.service';
import { OAuth2FlowService } from '../oauth-flow.service';
import { OAuthServerService } from '../oauth-server.service';
import { OAuthTokenService } from '../oauth-token.service';

// The flow service is driven directly via the DI container; the test server is
// set up only for the real DB + module registration (resolvers, token service).
setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let member: User;
let formEndpoint: string;
let webhookEndpoint: string;

let flow: OAuth2FlowService;
let codes: OAuthAuthorizationCodeService;
let oauthServer: OAuthServerService;
let tokenService: OAuthTokenService;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const resourceUrlFor = (webhookPath: string) =>
	`${webhookBaseUrl()}/${formEndpoint}/${webhookPath}`;

const decodeJwtPayload = (token: string): Record<string, unknown> =>
	JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<string, unknown>;

const formTriggerNode = (): INode => ({
	id: randomUUID(),
	name: 'On form submission',
	type: FORM_TRIGGER_NODE_TYPE,
	typeVersion: 2,
	position: [0, 0],
	// `requireExecuteAccess` is opt-in, so set it explicitly: these tests exercise the
	// execute-access gate on the resource the flow issues tokens for.
	parameters: { path: 'unused', authentication: 'n8nUserAuth', requireExecuteAccess: true },
});

/** Active form workflow + production webhook row; returns the canonical resource URL. */
const createProtectedFormWorkflow = async (ownedBy = owner) => {
	const node = formTriggerNode();
	const webhookPath = randomUUID();
	const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, ownedBy);
	await setActiveVersion(workflow.id, workflow.versionId);
	await Container.get(WebhookRepository).insert({
		workflowId: workflow.id,
		webhookPath,
		method: 'POST',
		node: node.name,
	});
	return resourceUrlFor(webhookPath);
};

const chatTriggerNode = (): INode => ({
	id: randomUUID(),
	name: 'When chat message received',
	type: CHAT_TRIGGER_NODE_TYPE,
	typeVersion: 1.3,
	position: [0, 0],
	webhookId: randomUUID(),
	parameters: { public: true, mode: 'hostedChat', authentication: 'n8nUserAuth' },
});

/** Active chat workflow + the two production webhook rows; returns the chat page URL. */
const createProtectedChatWorkflow = async (ownedBy = owner) => {
	const node = chatTriggerNode();
	const path = `${randomUUID()}/${CHAT_TRIGGER_PATH_SUFFIX}`;
	const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, ownedBy);
	await setActiveVersion(workflow.id, workflow.versionId);
	await Container.get(WebhookRepository).insert([
		{ workflowId: workflow.id, webhookPath: path, method: 'GET', node: node.name },
		{ workflowId: workflow.id, webhookPath: path, method: 'POST', node: node.name },
	]);
	return `${webhookBaseUrl()}/${webhookEndpoint}/${path}`;
};

/**
 * Drive the browser legs the backend never performs itself in a test: pull the
 * PKCE challenge + state out of the authorize URL, materialize the virtual client
 * row, and mint the authorization code the AS would issue after consent. Returns
 * the code + state to hand to `complete`.
 */
const authorizeAndMintCode = async (
	resourceUrl: string,
	userId: string,
	metadata?: Record<string, string>,
) => {
	const url = new URL(await flow.begin(resourceUrl, metadata));
	const state = url.searchParams.get('state')!;
	const codeChallenge = url.searchParams.get('code_challenge')!;

	await oauthServer.clientsStore.getClient(resourceUrl); // lazy-upsert the virtual client row
	const code = await codes.createAuthorizationCode(
		resourceUrl,
		userId,
		resourceUrl,
		codeChallenge,
		state,
		resourceUrl,
		[],
	);
	return { code, state };
};

beforeAll(async () => {
	process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2 = 'true'; // gates the chat-trigger resolver
	owner = await createOwner();
	member = await createMember();
	const { endpoints } = Container.get(GlobalConfig);
	formEndpoint = endpoints.form;
	webhookEndpoint = endpoints.webhook;
	flow = Container.get(OAuth2FlowService);
	codes = Container.get(OAuthAuthorizationCodeService);
	oauthServer = Container.get(OAuthServerService);
	tokenService = Container.get(OAuthTokenService);
});

afterAll(() => {
	delete process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2;
});

afterEach(async () => {
	await Container.get(CacheService).reset();
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

describe('begin', () => {
	test('builds an /oauth/authorize URL with coincident client_id, redirect_uri and resource', async () => {
		const resourceUrl = await createProtectedFormWorkflow();

		const url = new URL(await flow.begin(resourceUrl));

		expect(url.pathname).toBe('/oauth/authorize');
		expect(Object.fromEntries(url.searchParams)).toMatchObject({
			response_type: 'code',
			client_id: resourceUrl,
			redirect_uri: resourceUrl,
			resource: resourceUrl,
			code_challenge_method: 'S256',
		});
		expect(url.searchParams.get('code_challenge')).toBeTruthy();
		expect(url.searchParams.get('state')).toBeTruthy();
	});

	test('rejects a resource URL that is not a first-party protected resource', async () => {
		await expect(flow.begin(resourceUrlFor(randomUUID()))).rejects.toThrow(UserError);
	});
});

describe('complete', () => {
	test('exchanges the code for a validated token (sub=submitter, aud=form resource)', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const { code, state } = await authorizeAndMintCode(resourceUrl, owner.id);

		const result = await flow.complete(code, state);

		expect(result).toMatchObject({ valid: true, user: { id: owner.id } });
		if (result.valid) {
			expect(decodeJwtPayload(result.token).sub).toBe(owner.id);
			expect(decodeJwtPayload(result.token).aud).toBe(resourceUrl);
		}
	});

	// The AS already mints and persists these; a caller that never sees them can only
	// restart the whole flow when the access token expires.
	test('returns the refresh token and the access token lifetime', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const { code, state } = await authorizeAndMintCode(resourceUrl, owner.id);

		const result = await flow.complete(code, state);

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.refreshToken).toEqual(expect.any(String));
			expect(result.refreshToken).not.toBe(result.token);
			expect(result.expiresIn).toBeGreaterThan(0);
		}
	});

	test('returns metadata stashed at begin, and undefined when none was stashed', async () => {
		const resourceUrl = await createProtectedFormWorkflow();

		const withMeta = await authorizeAndMintCode(resourceUrl, owner.id, { query: 'foo=bar' });
		const result = await flow.complete(withMeta.code, withMeta.state);
		expect(result).toMatchObject({ valid: true, metadata: { query: 'foo=bar' } });

		const withoutMeta = await authorizeAndMintCode(resourceUrl, owner.id);
		const bareResult = await flow.complete(withoutMeta.code, withoutMeta.state);
		expect(bareResult.valid).toBe(true);
		if (bareResult.valid) expect(bareResult.metadata).toBeUndefined();
	});

	test('rejects an unknown state', async () => {
		const result = await flow.complete('some-code', 'unknown-state');

		expect(result).toEqual({ valid: false, reason: 'invalid_state' });
	});

	test('consumes the state so a replay is rejected', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const { code, state } = await authorizeAndMintCode(resourceUrl, owner.id);

		await flow.complete(code, state);
		const replay = await flow.complete(code, state);

		expect(replay).toEqual({ valid: false, reason: 'invalid_state' });
	});

	test('rejects when the PKCE verifier does not match the code challenge', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const url = new URL(await flow.begin(resourceUrl));
		const state = url.searchParams.get('state')!;

		await oauthServer.clientsStore.getClient(resourceUrl);
		// Mint the code with a challenge that does NOT correspond to the cached verifier.
		const code = await codes.createAuthorizationCode(
			resourceUrl,
			owner.id,
			resourceUrl,
			'a-different-but-well-formed-code-challenge-value',
			state,
			resourceUrl,
			[],
		);

		const result = await flow.complete(code, state);

		expect(result).toEqual({ valid: false, reason: 'invalid_grant' });
	});

	test('rejects when the submitter lacks execute access on the workflow', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const { code, state } = await authorizeAndMintCode(resourceUrl, member.id);

		const result = await flow.complete(code, state);

		expect(result).toEqual({ valid: false, reason: 'insufficient_scope' });
	});

	test('produces a token that a different form resource rejects', async () => {
		const resourceUrlA = await createProtectedFormWorkflow();
		const resourceUrlB = await createProtectedFormWorkflow();
		const { code, state } = await authorizeAndMintCode(resourceUrlA, owner.id);

		const result = await flow.complete(code, state);
		expect(result.valid).toBe(true);

		if (result.valid) {
			const crossResource = await tokenService.verifyOAuthAccessToken(result.token, resourceUrlB);
			expect(crossResource.user).toBeNull();
		}
	});

	test('maps an already-consumed authorization code to invalid_grant instead of throwing', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const { code, state } = await authorizeAndMintCode(resourceUrl, owner.id);
		// The loser of a concurrent completion (double-submitted callback) hits an
		// already-used code; it must surface as a graceful result, not a thrown error.
		await codes.markAuthorizationCodeAsUsed(code);

		const result = await flow.complete(code, state);

		expect(result).toEqual({ valid: false, reason: 'invalid_grant' });
	});
});

describe('refresh', () => {
	/** Complete a flow and hand back the refresh token it issued. */
	const grantFor = async (resourceUrl: string, userId = owner.id) => {
		const { code, state } = await authorizeAndMintCode(resourceUrl, userId);
		const result = await flow.complete(code, state);
		if (!result.valid) throw new Error(`expected a valid flow, got ${result.reason}`);
		return result;
	};

	test('rotates into a fresh pair bound to the same grant', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const granted = await grantFor(resourceUrl);

		const refreshed = await flow.refresh(granted.refreshToken, resourceUrl);

		expect(refreshed.valid).toBe(true);
		if (refreshed.valid) {
			expect(refreshed.token).not.toBe(granted.token);
			expect(refreshed.refreshToken).not.toBe(granted.refreshToken);
			expect(refreshed.expiresIn).toBeGreaterThan(0);
			expect(decodeJwtPayload(refreshed.token).sub).toBe(owner.id);
			expect(decodeJwtPayload(refreshed.token).aud).toBe(resourceUrl);
		}
	});

	// Rotation deletes only the refresh row, so a message already in flight with the
	// previous access token must still be accepted.
	test('leaves the previous access token usable', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const granted = await grantFor(resourceUrl);

		await flow.refresh(granted.refreshToken, resourceUrl);

		await expect(
			tokenService.verifyOAuthAccessToken(granted.token, resourceUrl),
		).resolves.toMatchObject({ user: { id: owner.id } });
	});

	// The loser of a concurrent rotation presents a token `deleteValidByToken` already
	// consumed. It must surface on the union, never as a silent reuse.
	test('refuses a refresh token that was already consumed', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const granted = await grantFor(resourceUrl);

		const first = await flow.refresh(granted.refreshToken, resourceUrl);
		expect(first.valid).toBe(true);

		const replay = await flow.refresh(granted.refreshToken, resourceUrl);

		expect(replay).toEqual({ valid: false, reason: 'invalid_grant' });
	});

	test('refuses an unknown refresh token', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		await grantFor(resourceUrl);

		const result = await flow.refresh('not-a-refresh-token', resourceUrl);

		expect(result).toEqual({ valid: false, reason: 'invalid_grant' });
	});

	// The grant's own resource bounds every later token request on it (RFC 8707 §2.2).
	test('refuses a refresh token presented against another resource', async () => {
		const resourceUrlA = await createProtectedFormWorkflow();
		const resourceUrlB = await createProtectedFormWorkflow();
		const granted = await grantFor(resourceUrlA);

		const result = await flow.refresh(granted.refreshToken, resourceUrlB);

		expect(result).toEqual({ valid: false, reason: 'invalid_grant' });
	});

	test('refuses a resource URL that is not a first-party protected resource', async () => {
		await expect(flow.refresh('any-token', resourceUrlFor(randomUUID()))).rejects.toThrow(
			UserError,
		);
	});

	test('rotates a chat grant the same way', async () => {
		const chatResourceUrl = await createProtectedChatWorkflow();
		const granted = await grantFor(chatResourceUrl, member.id);

		const refreshed = await flow.refresh(granted.refreshToken, chatResourceUrl);

		expect(refreshed.valid).toBe(true);
		if (refreshed.valid) {
			expect(decodeJwtPayload(refreshed.token).sub).toBe(member.id);
			expect(decodeJwtPayload(refreshed.token).aud).toBe(chatResourceUrl);
		}
	});

	// A page that refreshes for hours must not accumulate live refresh rows: the AS
	// deletes the one it consumes, so the grant always holds exactly one.
	test('keeps exactly one refresh row across repeated rotations', async () => {
		const resourceUrl = await createProtectedChatWorkflow();
		let current = (await grantFor(resourceUrl)).refreshToken;

		for (let i = 0; i < 3; i++) {
			const refreshed = await flow.refresh(current, resourceUrl);
			if (!refreshed.valid) throw new Error(`rotation ${i} failed: ${refreshed.reason}`);
			current = refreshed.refreshToken;
		}

		await expect(
			Container.get(RefreshTokenRepository).countBy({ clientId: resourceUrl }),
		).resolves.toBe(1);
	});
});

/**
 * Direct cover for "a credential-connect OAuth request initiated from a chat session is
 * accepted as legitimate": otherwise it only holds transitively through `N8NIdentifier`.
 */
describe('chat trigger resources', () => {
	test('begins a flow against a chat resource and completes it into a chat-scoped token', async () => {
		const chatResourceUrl = await createProtectedChatWorkflow();

		const url = new URL(await flow.begin(chatResourceUrl));
		expect(Object.fromEntries(url.searchParams)).toMatchObject({
			client_id: chatResourceUrl,
			redirect_uri: chatResourceUrl,
			resource: chatResourceUrl,
		});

		const { code, state } = await authorizeAndMintCode(chatResourceUrl, member.id);
		const result = await flow.complete(code, state);

		// No execute gate on chat yet, so any authenticated visitor completes the flow.
		expect(result).toMatchObject({ valid: true, user: { id: member.id } });
		if (result.valid) {
			expect(decodeJwtPayload(result.token).sub).toBe(member.id);
			expect(decodeJwtPayload(result.token).aud).toBe(chatResourceUrl);
		}
	});

	test('produces a token that another trigger resource rejects', async () => {
		const chatResourceUrl = await createProtectedChatWorkflow();
		const otherChatResourceUrl = await createProtectedChatWorkflow();
		const formResourceUrl = await createProtectedFormWorkflow();
		const { code, state } = await authorizeAndMintCode(chatResourceUrl, owner.id);

		const result = await flow.complete(code, state);
		expect(result.valid).toBe(true);

		if (result.valid) {
			await expect(
				tokenService.verifyOAuthAccessToken(result.token, otherChatResourceUrl),
			).resolves.toMatchObject({ user: null });
			await expect(
				tokenService.verifyOAuthAccessToken(result.token, formResourceUrl),
			).resolves.toMatchObject({ user: null });
		}
	});
});
