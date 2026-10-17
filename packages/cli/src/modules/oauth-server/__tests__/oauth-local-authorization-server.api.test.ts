import { Logger } from '@n8n/backend-common';
import type { OAuthDiscoveryClient } from '@n8n/backend-services';
import { CacheService, UrlService } from '@n8n/backend-services';
import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	AuthenticationService,
	LocalAuthorizationServer,
	trustedSourceConfigSchemaFor,
	TrustedSourceMetadataSchema,
	type Extracted,
} from '@n8n/inbound-auth';
import { DataSource, type Repository } from '@n8n/typeorm';
import type { JSONWebKeySet } from 'jose';
import { decodeProtectedHeader } from 'jose';
import { Cipher } from 'n8n-core';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { TrustedSourceEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source.entity';
import { TrustedSourceDiscoveryService } from '@/modules/inbound-auth-core/trusted-source-discovery.service';
import { TrustedSourceDbStore } from '@/modules/inbound-auth-core/trusted-source.store';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthServerLocalAuthorizationServer } from '../oauth-local-authorization-server';
import { OAuthTokenService } from '../oauth-token.service';

const testServer = setupTestServer({
	modules: ['oauth-jwe', 'oauth-server', 'mcp', 'inbound-auth-core'],
	endpointGroups: ['mcp', 'jwks'],
});

let owner: User;
let issuer: string;
let resource: string;
let rows: Repository<TrustedSourceEntity>;
let client: MockProxy<OAuthDiscoveryClient>;
let discovery: TrustedSourceDiscoveryService;

const extracted = (token: string): Extracted => ({
	surface: 'instance-mcp',
	resource: { url: resource, acceptedAudiences: [resource] },
	request: {
		method: 'POST',
		url: '/mcp-server/http',
		headers: { authorization: 'Bearer x' },
		ip: '203.0.113.7',
	},
	receivedAt: new Date(),
	credential: { kind: 'bearer', token },
});

/** The system source as IAM-1441 seeds it: not discovered yet. */
async function seedSystemSource(): Promise<string> {
	const config = trustedSourceConfigSchemaFor('system').parse({
		version: 1,
		authentication: { type: 'oauth2', keys: { kind: 'local-keystore' } },
		surfaces: { 'instance-mcp': {} },
	});
	const row = await rows.save(
		rows.create({
			name: 'n8n-internal',
			type: 'oauth2',
			issuer,
			managedBy: 'system',
			status: 'unchecked',
			lastError: null,
			lastCheckedAt: null,
			configVersion: 1,
			config: await Container.get(Cipher).encryptV2(config),
			metadata: null,
			discoveryClaimToken: null,
			discoveryClaimedAt: null,
		}),
	);
	return row.id;
}

beforeAll(async () => {
	owner = await createOwner();
	await Container.get(CacheService).init();
	issuer = Container.get(UrlService).getInstanceBaseUrl();
	resource = `${issuer}/mcp-server/http`;
	rows = Container.get(DataSource).getRepository(TrustedSourceEntity);

	client = mock<OAuthDiscoveryClient>();
	const offline = new Error('discovery must not go over HTTP');
	client.fetchOpenIdConfiguration.mockRejectedValue(offline);
	client.fetchOAuth2ServerMetadata.mockRejectedValue(offline);
	client.fetchJwks.mockRejectedValue(offline);
	discovery = new TrustedSourceDiscoveryService(
		Container.get(Logger),
		Container.get(TrustedSourceDbStore),
		client,
		Container.get(LocalAuthorizationServer),
	);
});

beforeEach(async () => {
	await testDb.truncate(['TrustedSourceEntity']);
	await Container.get(CacheService).reset();
	vi.clearAllMocks();
});

describe('OAuth server as a trusted source', () => {
	it('binds the local authorization server contract', () => {
		expect(Container.get(LocalAuthorizationServer)).toBeInstanceOf(
			OAuthServerLocalAuthorizationServer,
		);
	});

	it('discovers the system source in process, from the documents the instance publishes', async () => {
		const id = await seedSystemSource();

		await discovery.refresh(id);

		const row = await rows.findOneByOrFail({ id });
		expect(row).toMatchObject({ status: 'healthy', lastError: null });
		const { documents } = TrustedSourceMetadataSchema.parse(JSON.parse(row.metadata!));

		const served = await testServer.restlessAgent
			.get('/.well-known/oauth-authorization-server')
			.expect(200);
		const metadata = documents.find((doc) => doc.kind === 'oauth2-authorization-server');
		expect(metadata?.document).toEqual(served.body);
		expect(metadata?.document).toMatchObject({
			issuer,
			jwks_uri: Container.get(UrlService).getInstanceJwksUri(),
		});

		const published = await testServer.restlessAgent
			.get(new URL(served.body.jwks_uri as string).pathname)
			.expect(200);
		const activeKid = (published.body as JSONWebKeySet).keys.find((key) => key.use === 'sig')?.kid;
		const jwks = documents.find((doc) => doc.kind === 'jwks');
		expect(activeKid).toBeDefined();
		expect(jwks?.keys.map((key) => key.kid)).toContain(activeKid);

		expect(client.fetchOpenIdConfiguration).not.toHaveBeenCalled();
		expect(client.fetchOAuth2ServerMetadata).not.toHaveBeenCalled();
		expect(client.fetchJwks).not.toHaveBeenCalled();
	});

	it('authenticates an access token the instance minted against the discovered source', async () => {
		const id = await seedSystemSource();
		await discovery.refresh(id);

		const { accessToken } = Container.get(OAuthTokenService).generateTokenPair(
			owner.id,
			'client-1',
			resource,
			['tool:read'],
		);
		expect(decodeProtectedHeader(accessToken)).toMatchObject({
			kid: expect.any(String),
			typ: 'at+jwt',
		});

		const result = await Container.get(AuthenticationService).authenticate(extracted(accessToken));

		expect(result).toMatchObject({
			ok: true,
			value: { source: { id, issuer }, claims: { sub: owner.id } },
		});
	});

	it('rejects an access token the instance minted for another audience', async () => {
		const id = await seedSystemSource();
		await discovery.refresh(id);

		const { accessToken } = Container.get(OAuthTokenService).generateTokenPair(
			owner.id,
			'client-1',
			`${issuer}/other-resource`,
			['tool:read'],
		);

		const result = await Container.get(AuthenticationService).authenticate(extracted(accessToken));

		expect(result).toMatchObject({ ok: false, reason: 'audience-mismatch' });
	});
});
