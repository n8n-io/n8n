import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE, UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';
import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

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
	parameters: { path: 'unused', authentication: 'n8nOAuth2' },
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

/**
 * Drive the browser legs the backend never performs itself in a test: pull the
 * PKCE challenge + state out of the authorize URL, materialize the virtual client
 * row, and mint the authorization code the AS would issue after consent. Returns
 * the code + state to hand to `complete`.
 */
const authorizeAndMintCode = async (resourceUrl: string, userId: string) => {
	const url = new URL(await flow.begin(resourceUrl));
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
	owner = await createOwner();
	member = await createMember();
	formEndpoint = Container.get(GlobalConfig).endpoints.form;
	flow = Container.get(OAuth2FlowService);
	codes = Container.get(OAuthAuthorizationCodeService);
	oauthServer = Container.get(OAuthServerService);
	tokenService = Container.get(OAuthTokenService);
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
