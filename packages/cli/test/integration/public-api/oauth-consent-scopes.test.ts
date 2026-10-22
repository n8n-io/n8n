import { Logger } from '@n8n/backend-common';
import {
	CacheService,
	JwtService,
	type OAuthDiscoveryClient,
	UrlService,
} from '@n8n/backend-services';
import { testDb } from '@n8n/backend-test-utils';
import { TagRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { LocalAuthorizationServer } from '@n8n/inbound-auth';
import { createHash, randomBytes } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { PublicApiProtectedResource } from '@/modules/inbound-auth-core/public-api-protected-resource';
import { TrustedSourceDiscoveryService } from '@/modules/inbound-auth-core/trusted-source-discovery.service';
import { TrustedSourceDbStore } from '@/modules/inbound-auth-core/trusted-source.store';
import { OAuthClientRepository } from '@/modules/oauth-server/database/repositories/oauth-client.repository';
import {
	sessionCookieFor,
	TEST_FLOW_ID,
} from '@/modules/oauth-server/__tests__/oauth-flow-test-utils';
import type { OAuthSessionPayload } from '@/modules/oauth-server/oauth-session.service';
import { createMember, createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

/**
 * The whole chain, nothing mocked but the network: the user picks scopes on the consent screen,
 * the instance mints a token for `/api/v1`, the trusted-source pipeline verifies it against the
 * instance's own keys, and the public API allows only what was picked.
 */
const testServer = setupTestServer({
	modules: ['oauth-jwe', 'oauth-server', 'mcp', 'inbound-auth-core'],
	endpointGroups: ['mcp', 'jwks', 'publicApi'],
});

const REDIRECT_URI = 'https://example.com/callback';
const b64url = (buf: Buffer) => buf.toString('base64url');

let owner: User;
let member: User;
let resource: string;
let jwtService: JwtService;

beforeAll(async () => {
	await Container.get(CacheService).init();
	owner = await createOwner();
	member = await createMember();
	jwtService = Container.get(JwtService);
	resource = Container.get(PublicApiProtectedResource).getResourceUrl();

	// The module seeded `n8n-internal` at init; discovery normally runs as a system task. Run it
	// once here, reading the local authorization server in process, never over HTTP.
	const offline = mock<OAuthDiscoveryClient>();
	const refused = new Error('discovery must not go over HTTP');
	offline.fetchOpenIdConfiguration.mockRejectedValue(refused);
	offline.fetchOAuth2ServerMetadata.mockRejectedValue(refused);
	offline.fetchJwks.mockRejectedValue(refused);
	const discovery = new TrustedSourceDiscoveryService(
		Container.get(Logger),
		Container.get(TrustedSourceDbStore),
		offline,
		Container.get(LocalAuthorizationServer),
	);
	await discovery.refresh('n8n-internal');
	await Container.get(CacheService).reset();
});

afterEach(async () => {
	await testDb.truncate([
		'OAuthClient',
		'AuthorizationCode',
		'AccessToken',
		'RefreshToken',
		'UserConsent',
		'TagEntity',
	]);
});

async function registerClient(): Promise<string> {
	const id = `client-${randomBytes(6).toString('hex')}`;
	await Container.get(OAuthClientRepository).save({
		id,
		name: 'scope test client',
		redirectUris: [REDIRECT_URI],
		grantTypes: ['authorization_code', 'refresh_token'],
		tokenEndpointAuthMethod: 'none',
		clientSecret: null,
		clientSecretExpiresAt: null,
		isFirstParty: false,
	});
	return id;
}

/** What the consent screen posts after the user picked `scopes`, then the code-for-token exchange. */
async function consentAndExchange(user: User, scopes: string[], requestedScopes?: string[]) {
	const clientId = await registerClient();
	const verifier = b64url(randomBytes(32));
	const payload: OAuthSessionPayload = {
		clientId,
		redirectUri: REDIRECT_URI,
		codeChallenge: b64url(createHash('sha256').update(verifier).digest()),
		state: null,
		resource,
		...(requestedScopes && { requestedScopes }),
	};
	const session = jwtService.sign('oauthSession', payload, { expiresIn: '10m' });

	const approval = await testServer
		.authAgentFor(user)
		.post('/consent/approve')
		.set('Cookie', sessionCookieFor(TEST_FLOW_ID, session))
		.send({ approved: true, scopes, flow: TEST_FLOW_ID });
	if (approval.statusCode !== 200) return { approval, token: undefined };

	const code = new URL(approval.body.data.redirectUrl as string).searchParams.get('code');
	const token = await testServer.restlessAgent.post('/oauth/token').type('form').send({
		grant_type: 'authorization_code',
		code,
		code_verifier: verifier,
		client_id: clientId,
		redirect_uri: REDIRECT_URI,
		resource,
	});
	return { approval, token };
}

const api = () => testServer.publicApiAgentWithoutApiKey();

describe('Public API access from a consent-scoped token', () => {
	test('advertises the API key scopes and the instance as authorization server for /api/v1', async () => {
		const metadata = await testServer.restlessAgent
			.get('/.well-known/oauth-protected-resource/api/v1')
			.expect(200);

		expect(metadata.body).toMatchObject({
			resource,
			authorization_servers: [Container.get(UrlService).getInstanceBaseUrl()],
			scopes_supported: expect.arrayContaining(['tag:list', 'tag:create']),
		});
	});

	test('a token granted tag:list can list tags but cannot create one', async () => {
		const { token } = await consentAndExchange(owner, ['tag:list']);
		expect(token?.statusCode).toBe(200);
		const accessToken = token!.body.access_token as string;
		expect(jwtService.decodeUnverified(accessToken)).toMatchObject({
			aud: resource,
			sub: owner.id,
			scope: 'tag:list',
		});

		const listed = await api().get('/tags').set('Authorization', `Bearer ${accessToken}`);
		const created = await api()
			.post('/tags')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ name: 'oauth' });

		expect(listed.statusCode).toBe(200);
		expect(created.statusCode).toBe(403);
		expect(await Container.get(TagRepository).count()).toBe(0);
	});

	test('a token granted tag:list and tag:create can do both', async () => {
		const { token } = await consentAndExchange(owner, ['tag:list', 'tag:create']);
		const accessToken = token!.body.access_token as string;

		const created = await api()
			.post('/tags')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ name: 'oauth' });
		const listed = await api().get('/tags').set('Authorization', `Bearer ${accessToken}`);

		expect(created.statusCode).toBe(201);
		expect(listed.statusCode).toBe(200);
		expect(listed.body.data).toHaveLength(1);
	});

	test('the consent screen refuses a scope the client did not request', async () => {
		const { approval } = await consentAndExchange(owner, ['tag:create'], ['tag:list']);

		expect(approval.statusCode).toBe(400);
	});

	test('the consent screen refuses a scope the user cannot grant', async () => {
		const { approval } = await consentAndExchange(member, ['tag:list', 'user:create']);

		expect(approval.statusCode).toBe(400);
	});

	test('a refreshed token keeps the granted scopes', async () => {
		const { token } = await consentAndExchange(owner, ['tag:list']);
		const clientId = jwtService.decodeUnverified(token!.body.access_token as string).client_id;

		const refreshed = await testServer.restlessAgent.post('/oauth/token').type('form').send({
			grant_type: 'refresh_token',
			refresh_token: token!.body.refresh_token,
			client_id: clientId,
			scope: 'tag:list tag:create',
		});
		expect(refreshed.statusCode).toBe(200);
		const accessToken = refreshed.body.access_token as string;
		expect(jwtService.decodeUnverified(accessToken).scope).toBe('tag:list');

		const created = await api()
			.post('/tags')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ name: 'oauth' });

		expect(created.statusCode).toBe(403);
	});
});
