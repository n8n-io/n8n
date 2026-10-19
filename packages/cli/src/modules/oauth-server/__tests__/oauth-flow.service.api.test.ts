import { Logger } from '@n8n/backend-common';
import { createFakeOutboundHttp, type Route } from '@n8n/backend-network/testing';
import type { OAuthDiscoveryClient } from '@n8n/backend-services';
import { CacheService, UrlService } from '@n8n/backend-services';
import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository, WorkflowHistoryRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	JwkSchema,
	LocalAuthorizationServer,
	TrustedSourceStore,
	ResourceAdmission,
	type Jwk,
	type TrustedSource,
	type TrustedSourceConfigInput,
	type TrustedSourceMetadata,
} from '@n8n/inbound-auth';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWTPayload } from 'jose';
import type { INode } from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_PATH_SUFFIX,
	FORM_TRIGGER_NODE_TYPE,
	UserError,
} from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { ProtectedResourceRegistry } from '@n8n/backend-services/auth';
import { TrustedSourceIdentityRepository } from '@/modules/inbound-auth-core/database/repositories/trusted-source-identity.repository';
import { SystemTrustedSourceSeeder } from '@/modules/inbound-auth-core/system-trusted-source.seeder';
import { TrustedSourceDiscoveryService } from '@/modules/inbound-auth-core/trusted-source-discovery.service';
import { TrustedSourceDbStore } from '@/modules/inbound-auth-core/trusted-source.store';
import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { RefreshTokenRepository } from '../database/repositories/oauth-refresh-token.repository';
import { OAuthAuthorizationCodeService } from '../oauth-authorization-code.service';
import { encodeRefreshGrant, OAuth2FlowService } from '../oauth-flow.service';
import { OAuthServerService } from '../oauth-server.service';
import { OAuthTokenService } from '../oauth-token.service';

// The flow service is driven directly via the DI container; the test server is
// set up only for the real DB + module registration (resolvers, token service).
// inbound-auth-core goes first: it binds the contracts the flow service injects.
setupTestServer({
	modules: ['inbound-auth-core', 'oauth-server', 'mcp'],
	endpointGroups: ['mcp'],
});

const IDP_ISSUER = 'https://idp.example';
const IDP_SUBJECT = 'idp-alice';

let owner: User;
let member: User;
let formEndpoint: string;
let webhookEndpoint: string;
let instanceBaseUrl: string;

let flow: OAuth2FlowService;
let codes: OAuthAuthorizationCodeService;
let oauthServer: OAuthServerService;
let tokenService: OAuthTokenService;
let store: TrustedSourceDbStore;
let discovery: TrustedSourceDiscoveryService;

let idpPrivateKey: CryptoKey;
let idpJwks: TrustedSourceMetadata['documents'][number];

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const resourceUrlFor = (webhookPath: string) =>
	`${webhookBaseUrl()}/${formEndpoint}/${webhookPath}`;

const decodeJwtPayload = (token: string): Record<string, unknown> =>
	JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<string, unknown>;

const formTriggerNode = (trustedSource?: string): INode => ({
	id: randomUUID(),
	name: 'On form submission',
	type: FORM_TRIGGER_NODE_TYPE,
	typeVersion: 2,
	position: [0, 0],
	// `requireExecuteAccess` is opt-in, so set it explicitly: these tests exercise the
	// execute-access gate on the resource the flow issues tokens for.
	parameters: {
		path: 'unused',
		authentication: 'n8nUserAuth',
		requireExecuteAccess: true,
		...(trustedSource === undefined ? {} : { trustedSource }),
	},
});

/**
 * Active form workflow + production webhook row; returns the canonical resource URL.
 * `trustedSource` is the node's selection; absent, the trigger accepts the instance's own server.
 */
const createProtectedFormWorkflow = async (ownedBy = owner, trustedSource?: string) => {
	const node = formTriggerNode(trustedSource);
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

/** Rewrites the trigger's `trustedSource` on its active version, as a later save of the node would. */
const selectTrustedSource = async (resourceUrl: string, trustedSource: string) => {
	const webhookPath = resourceUrl.slice(resourceUrlFor('').length);
	const webhook = await Container.get(WebhookRepository).findOneByOrFail({ webhookPath });
	const workflow = await Container.get(WorkflowRepository).findOneOrFail({
		where: { id: webhook.workflowId },
		relations: { activeVersion: true },
	});
	const nodes = workflow.activeVersion!.nodes.map((node) => ({
		...node,
		parameters: { ...node.parameters, trustedSource },
	}));
	await Container.get(WorkflowHistoryRepository).update(
		{ versionId: workflow.activeVersion!.versionId },
		{ nodes },
	);
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

/**
 * The system source as the instance boots it: seeded, then discovered in process. The
 * discovery task does not run in tests, and the store's own tables are truncated after
 * every test, so the boot path runs before each one.
 */
const bootSystemSource = async () => {
	await Container.get(SystemTrustedSourceSeeder).seed();
	await discovery.refresh('n8n-internal');
};

/** An external issuer, discovered: its JWKS is on file and its status is healthy. */
const createIdpSource = async (
	overrides: {
		authentication?: Partial<
			Extract<TrustedSourceConfigInput['authentication'], { type: 'oauth2' }>
		>;
		surfaces?: TrustedSourceConfigInput['surfaces'];
	} = {},
): Promise<TrustedSource> => {
	const created = await store.create({
		name: `idp-${randomUUID()}`,
		issuer: IDP_ISSUER,
		config: {
			version: 1,
			authentication: {
				type: 'oauth2',
				discovery: {
					mode: 'manual',
					jwksUri: `${IDP_ISSUER}/keys`,
					authorizationEndpoint: `${IDP_ISSUER}/authorize`,
					tokenEndpoint: `${IDP_ISSUER}/token`,
				},
				client: {
					kind: 'registered',
					clientId: 'n8n-client',
					clientSecret: 's3cret',
					scopes: ['openid', 'email'],
				},
				...overrides.authentication,
			},
			surfaces: overrides.surfaces ?? { trigger: {} },
		},
	});
	const token = await store.claimDiscovery(created);
	if (token === null) throw new Error('could not claim discovery');
	await store.recordDiscovery(created, token, {
		metadata: { version: 1, documents: [idpJwks] },
		status: 'healthy',
		lastError: null,
	});
	const source = await store.getById(created.id);
	if (!source) throw new Error('source did not load');
	return source;
};

const bindIdpSubject = async (sourceId: string, userId: string) => {
	await Container.get(TrustedSourceIdentityRepository).insertIfAbsent({
		sourceId,
		subject: IDP_SUBJECT,
		userId,
		provenance: 'admin',
		status: 'active',
	});
};

/** An access token as the external issuer would mint it for the trigger. */
const signIdpToken = async (audience: string, claims: JWTPayload = {}) => {
	const iat = Math.floor(Date.now() / 1000);
	return await new SignJWT({
		iss: IDP_ISSUER,
		sub: IDP_SUBJECT,
		aud: audience,
		iat,
		exp: iat + 3600,
		...claims,
	})
		.setProtectedHeader({ alg: 'ES256', kid: 'idp-k1', typ: 'at+jwt' })
		.sign(idpPrivateKey);
};

/** A flow service whose token-endpoint calls answer from `routes` instead of the network. */
const flowWithTokenEndpoint = (routes: Route[]) => {
	const { outboundHttp, httpRequest } = createFakeOutboundHttp(
		routes,
		vi.fn as unknown as Parameters<typeof createFakeOutboundHttp>[1],
	);
	const service = new OAuth2FlowService(
		Container.get(OAuthServerService),
		Container.get(ProtectedResourceRegistry),
		Container.get(CacheService),
		Container.get(TrustedSourceStore),
		Container.get(ResourceAdmission),
		outboundHttp,
		Container.get(Logger),
	);
	return { service, httpRequest };
};

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
	const { endpoints } = Container.get(GlobalConfig);
	formEndpoint = endpoints.form;
	webhookEndpoint = endpoints.webhook;
	instanceBaseUrl = Container.get(UrlService).getInstanceBaseUrl();
	flow = Container.get(OAuth2FlowService);
	codes = Container.get(OAuthAuthorizationCodeService);
	oauthServer = Container.get(OAuthServerService);
	tokenService = Container.get(OAuthTokenService);
	store = Container.get(TrustedSourceDbStore);

	// The system source is discovered in process; nothing here may go over HTTP.
	const client = mock<OAuthDiscoveryClient>();
	const offline = new Error('discovery must not go over HTTP');
	client.fetchOpenIdConfiguration.mockRejectedValue(offline);
	client.fetchOAuth2ServerMetadata.mockRejectedValue(offline);
	client.fetchJwks.mockRejectedValue(offline);
	discovery = new TrustedSourceDiscoveryService(
		Container.get(Logger),
		store,
		client,
		Container.get(LocalAuthorizationServer),
	);

	const pair = await generateKeyPair('ES256');
	idpPrivateKey = pair.privateKey;
	const jwk: Jwk = JwkSchema.parse({
		...(await exportJWK(pair.publicKey)),
		kid: 'idp-k1',
		alg: 'ES256',
		use: 'sig',
	});
	idpJwks = {
		kind: 'jwks',
		fetchedAt: new Date().toISOString(),
		url: `${IDP_ISSUER}/keys`,
		keys: [jwk],
	};
});

beforeEach(async () => {
	await bootSystemSource();
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
		'TrustedSourceIdentityEntity',
		'TrustedSourceEntity',
	]);
});

describe('begin', () => {
	test("builds an authorize URL at the instance's own server with coincident client_id, redirect_uri and resource", async () => {
		const resourceUrl = await createProtectedFormWorkflow();

		const url = new URL(await flow.begin(resourceUrl));

		// The endpoint comes from the discovered metadata of the system source, not from a
		// hardcoded instance URL.
		expect(`${url.origin}${url.pathname}`).toBe(`${instanceBaseUrl}/mcp-oauth/authorize`);
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

	test('refuses an unknown trusted source before any redirect', async () => {
		const resourceUrl = await createProtectedFormWorkflow(owner, 'no-such-source');

		await expect(flow.begin(resourceUrl)).rejects.toThrow(/Unknown trusted source/);
	});

	test('refuses a source without the redirect-login capability, naming the capability', async () => {
		const source = await createIdpSource({ authentication: { client: undefined } });
		const resourceUrl = await createProtectedFormWorkflow(owner, source.id);

		await expect(flow.begin(resourceUrl)).rejects.toThrow(/no redirect-login capability/);
	});

	test('refuses a source that is not accepted on the trigger surface', async () => {
		const source = await createIdpSource({ surfaces: { 'instance-mcp': {} } });
		const resourceUrl = await createProtectedFormWorkflow(owner, source.id);

		await expect(flow.begin(resourceUrl)).rejects.toThrow(/not accepted on the trigger surface/);
	});

	test("sends the browser to a registered source's authorization endpoint with its client", async () => {
		const source = await createIdpSource();
		const resourceUrl = await createProtectedFormWorkflow(owner, source.id);

		const url = new URL(await flow.begin(resourceUrl));

		expect(`${url.origin}${url.pathname}`).toBe(`${IDP_ISSUER}/authorize`);
		expect(Object.fromEntries(url.searchParams)).toMatchObject({
			response_type: 'code',
			client_id: 'n8n-client',
			redirect_uri: resourceUrl,
			resource: resourceUrl,
			scope: 'openid email',
			code_challenge_method: 'S256',
		});
		expect(url.searchParams.get('code_challenge')).toBeTruthy();
		expect(url.searchParams.get('state')).toBeTruthy();
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

	test('refuses to complete once the trigger accepts another source than the flow began with', async () => {
		const resourceUrl = await createProtectedFormWorkflow();
		const { code, state } = await authorizeAndMintCode(resourceUrl, owner.id);
		await selectTrustedSource(resourceUrl, 'some-other-source');

		const result = await flow.complete(code, state);

		expect(result).toEqual({ valid: false, reason: 'invalid_state' });
		// The state was consumed: the flow restarts rather than retrying with the right source.
		expect(await flow.complete(code, state)).toEqual({ valid: false, reason: 'invalid_state' });
	});
});

describe('complete against a registered source', () => {
	const tokenRoute = (body: unknown, status = 200): Route => ({
		method: 'POST',
		pathname: '/token',
		status,
		body,
	});

	/** A form trigger that signs in at the IdP, with the owner bound to the IdP subject by default. */
	const triggerAtIdp = async ({
		source: sourceOverrides,
		bind = 'owner',
	}: {
		source?: Parameters<typeof createIdpSource>[0];
		bind?: 'owner' | 'member' | 'none';
	} = {}) => {
		const source = await createIdpSource(sourceOverrides);
		const resourceUrl = await createProtectedFormWorkflow(owner, source.id);
		if (bind !== 'none') await bindIdpSubject(source.id, (bind === 'owner' ? owner : member).id);
		return { source, resourceUrl };
	};

	/** Begins the flow at the external source and hands back what its callback carries. */
	const beginAtIdp = async (service: OAuth2FlowService, resourceUrl: string) => {
		const url = new URL(await service.begin(resourceUrl));
		return { state: url.searchParams.get('state')!, code: 'idp-code' };
	};

	type ClientCase = {
		kind: string;
		client?: { kind: 'registered'; clientId: string; clientSecret?: string };
		expectClientAuth: (headers: Record<string, unknown>, body: URLSearchParams) => void;
	};

	// RFC 6749 §2.3.1: a secret goes in a Basic header; a public client names itself in the body.
	test.each<ClientCase>([
		{
			kind: 'confidential',
			expectClientAuth: (headers, body) => {
				expect(headers.authorization).toBe(
					`Basic ${Buffer.from('n8n-client:s3cret').toString('base64')}`,
				);
				expect(body.has('client_id')).toBe(false);
			},
		},
		{
			kind: 'public',
			client: { kind: 'registered', clientId: 'public-client' },
			expectClientAuth: (headers, body) => {
				expect(headers).not.toHaveProperty('authorization');
				expect(body.get('client_id')).toBe('public-client');
			},
		},
	])(
		'exchanges the code at the token endpoint as a $kind client and verifies the token through the pipeline',
		async ({ client, expectClientAuth }) => {
			const { source, resourceUrl } = await triggerAtIdp({
				source: client && { authentication: { client } },
			});
			const accessToken = await signIdpToken(resourceUrl);
			const { service, httpRequest } = flowWithTokenEndpoint([
				tokenRoute({
					access_token: accessToken,
					token_type: 'Bearer',
					expires_in: 1800,
					refresh_token: 'idp-refresh',
				}),
			]);
			const { code, state } = await beginAtIdp(service, resourceUrl);

			const result = await service.complete(code, state, {
				method: 'GET',
				url: `/form/x?code=${code}&state=${state}`,
				ip: '203.0.113.7',
			});

			expect(result).toEqual({
				valid: true,
				token: accessToken,
				refreshToken: encodeRefreshGrant(source.id, 'idp-refresh'),
				expiresIn: 1800,
				user: {
					id: owner.id,
					email: owner.email,
					firstName: owner.firstName,
					lastName: owner.lastName,
				},
				metadata: undefined,
			});

			// RFC 6749 §4.1.3 with PKCE and the RFC 8707 resource.
			expect(httpRequest).toHaveBeenCalledTimes(1);
			const [request] = httpRequest.mock.calls[0];
			expect(request).toMatchObject({
				url: `${IDP_ISSUER}/token`,
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
			});
			const body = new URLSearchParams(request.body as string);
			expect(Object.fromEntries(body)).toMatchObject({
				grant_type: 'authorization_code',
				code,
				redirect_uri: resourceUrl,
				resource: resourceUrl,
			});
			expect(body.get('code_verifier')).toBeTruthy();
			expectClientAuth(request.headers as Record<string, unknown>, body);
		},
	);

	test('takes the lifetime from the token when the issuer omits expires_in', async () => {
		const { resourceUrl } = await triggerAtIdp();
		const { service } = flowWithTokenEndpoint([
			tokenRoute({ access_token: await signIdpToken(resourceUrl) }),
		]);
		const { code, state } = await beginAtIdp(service, resourceUrl);

		const result = await service.complete(code, state);

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.refreshToken).toBeUndefined();
			expect(result.expiresIn).toBeGreaterThan(3500);
			expect(result.expiresIn).toBeLessThanOrEqual(3600);
		}
	});

	type RefusalCase = {
		name: string;
		bind?: 'owner' | 'member' | 'none';
		audience?: string;
		route?: Route;
		reason: string;
	};

	// The pipeline and the resource decide; the flow passes their reason through.
	test.each<RefusalCase>([
		{
			name: 'a token the issuer minted for another audience',
			audience: 'https://elsewhere.example',
			reason: 'audience-mismatch',
		},
		{
			// No binding, no email to link by, and provisioning is off by default.
			name: 'a subject the source has no binding for and may not provision',
			bind: 'none',
			reason: 'provision-refused',
		},
		{
			name: 'a bound user without execute access on the workflow',
			bind: 'member',
			reason: 'insufficient_scope',
		},
		{
			name: 'a token endpoint error response',
			route: tokenRoute({ error: 'invalid_grant' }, 400),
			reason: 'invalid_grant',
		},
	])('refuses $name with $reason', async ({ bind, audience, route, reason }) => {
		const { resourceUrl } = await triggerAtIdp({ bind });
		const { service } = flowWithTokenEndpoint([
			route ??
				tokenRoute({ access_token: await signIdpToken(audience ?? resourceUrl), expires_in: 60 }),
		]);
		const { code, state } = await beginAtIdp(service, resourceUrl);

		expect(await service.complete(code, state)).toEqual({ valid: false, reason });
	});

	test('refuses a source that lost its redirect-login capability since the flow began', async () => {
		const { source, resourceUrl } = await triggerAtIdp({ bind: 'none' });
		const { service, httpRequest } = flowWithTokenEndpoint([]);
		const { code, state } = await beginAtIdp(service, resourceUrl);
		await store.update(source.id, {
			config: {
				...source.config,
				authentication: { ...source.config.authentication, client: undefined },
			},
		});

		const result = await service.complete(code, state);

		expect(result).toEqual({ valid: false, reason: 'source_unusable' });
		expect(httpRequest).not.toHaveBeenCalled();
	});

	describe('refresh', () => {
		test('rotates the grant at the token endpoint as a confidential client', async () => {
			const { source, resourceUrl } = await triggerAtIdp();
			const accessToken = await signIdpToken(resourceUrl);
			const { service, httpRequest } = flowWithTokenEndpoint([
				tokenRoute({
					access_token: accessToken,
					token_type: 'Bearer',
					expires_in: 900,
					refresh_token: 'idp-refresh-2',
				}),
			]);

			const result = await service.refresh(
				encodeRefreshGrant(source.id, 'idp-refresh'),
				resourceUrl,
			);

			expect(result).toEqual({
				valid: true,
				token: accessToken,
				refreshToken: encodeRefreshGrant(source.id, 'idp-refresh-2'),
				expiresIn: 900,
			});
			// RFC 6749 §6 with the RFC 8707 resource, authenticated as the registered client.
			expect(httpRequest).toHaveBeenCalledTimes(1);
			const [request] = httpRequest.mock.calls[0];
			expect(request).toMatchObject({ url: `${IDP_ISSUER}/token`, method: 'POST' });
			expect(Object.fromEntries(new URLSearchParams(request.body as string))).toEqual({
				grant_type: 'refresh_token',
				refresh_token: 'idp-refresh',
				resource: resourceUrl,
			});
			expect((request.headers as Record<string, unknown>).authorization).toBe(
				`Basic ${Buffer.from('n8n-client:s3cret').toString('base64')}`,
			);
		});

		// RFC 6749 §6: an issuer that returns no refresh token keeps the presented one valid.
		test('keeps the presented refresh token and reads the lifetime off the token when the issuer omits both', async () => {
			const { source, resourceUrl } = await triggerAtIdp();
			const { service } = flowWithTokenEndpoint([
				tokenRoute({ access_token: await signIdpToken(resourceUrl) }),
			]);
			const grant = encodeRefreshGrant(source.id, 'idp-refresh');

			const result = await service.refresh(grant, resourceUrl);

			expect(result).toMatchObject({ valid: true, refreshToken: grant });
			if (result.valid) {
				expect(result.expiresIn).toBeGreaterThan(3500);
				expect(result.expiresIn).toBeLessThanOrEqual(3600);
			}
		});

		test('refuses a refresh token the issuer rejects', async () => {
			const { source, resourceUrl } = await triggerAtIdp();
			const { service } = flowWithTokenEndpoint([tokenRoute({ error: 'invalid_grant' }, 400)]);

			expect(
				await service.refresh(encodeRefreshGrant(source.id, 'idp-refresh'), resourceUrl),
			).toEqual({ valid: false, reason: 'invalid_grant' });
		});

		// A trigger moved to another source must not hand the first source's token to the second.
		test('refuses a grant another source issued, without presenting it anywhere', async () => {
			const { resourceUrl } = await triggerAtIdp();
			const { service, httpRequest } = flowWithTokenEndpoint([]);

			expect(
				await service.refresh(encodeRefreshGrant('previous-idp', 'idp-refresh'), resourceUrl),
			).toEqual({ valid: false, reason: 'invalid_grant' });
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('refuses a source that lost its redirect-login capability', async () => {
			const { source, resourceUrl } = await triggerAtIdp();
			const { service, httpRequest } = flowWithTokenEndpoint([]);
			await store.update(source.id, {
				config: {
					...source.config,
					authentication: { ...source.config.authentication, client: undefined },
				},
			});

			expect(
				await service.refresh(encodeRefreshGrant(source.id, 'idp-refresh'), resourceUrl),
			).toEqual({
				valid: false,
				reason: 'source_unusable',
			});
			expect(httpRequest).not.toHaveBeenCalled();
		});
	});
});

describe('refresh', () => {
	/** Complete a flow and hand back the refresh token it issued. */
	const grantFor = async (resourceUrl: string, userId = owner.id) => {
		const { code, state } = await authorizeAndMintCode(resourceUrl, userId);
		const result = await flow.complete(code, state);
		if (!result.valid) throw new Error(`expected a valid flow, got ${result.reason}`);
		// The internal server always grants one.
		if (!result.refreshToken) throw new Error('expected a refresh token');
		return { ...result, refreshToken: result.refreshToken };
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
