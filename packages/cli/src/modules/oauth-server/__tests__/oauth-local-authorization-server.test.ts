import type { UrlService } from '@n8n/backend-services';
import type { ProtectedResourceRegistry } from '@n8n/backend-services/auth';
import { AuthorizationServerMetadataSchema } from '@n8n/inbound-auth';
import type { JWK } from 'jose';
import { mock } from 'vitest-mock-extended';

import type { AccessTokenRepository } from '../database/repositories/oauth-access-token.repository';
import { OAuthServerLocalAuthorizationServer } from '../oauth-local-authorization-server';
import type { OAuthSigningJwksProvider } from '../oauth-signing-jwks.provider';

const BASE_URL = 'https://n8n.test';
const JWKS_URI = `${BASE_URL}/rest/.well-known/jwks.json`;

const signingJwk: JWK = {
	kty: 'EC',
	kid: 'row-sig',
	use: 'sig',
	alg: 'ES256',
	crv: 'P-256',
	x: 'x-coordinate',
	y: 'y-coordinate',
};

describe('OAuthServerLocalAuthorizationServer', () => {
	const urlService = mock<UrlService>();
	const registry = mock<ProtectedResourceRegistry>();
	const jwksProvider = mock<OAuthSigningJwksProvider>();
	const accessTokens = mock<AccessTokenRepository>();
	const server = new OAuthServerLocalAuthorizationServer(
		urlService,
		registry,
		jwksProvider,
		accessTokens,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue(BASE_URL);
		urlService.getInstanceJwksUri.mockReturnValue(JWKS_URI);
		registry.getAllScopes.mockReturnValue([]);
	});

	describe('getMetadata', () => {
		test('names the instance as issuer and advertises its JWKS and endpoints', async () => {
			const metadata = await server.getMetadata();

			expect(metadata).toMatchObject({
				issuer: BASE_URL,
				jwks_uri: JWKS_URI,
				authorization_endpoint: `${BASE_URL}/mcp-oauth/authorize`,
				token_endpoint: `${BASE_URL}/mcp-oauth/token`,
				registration_endpoint: `${BASE_URL}/mcp-oauth/register`,
				revocation_endpoint: `${BASE_URL}/mcp-oauth/revoke`,
			});
			expect(AuthorizationServerMetadataSchema.parse(metadata)).toEqual(metadata);
		});

		test('omits scopes_supported when no resource advertises scopes', async () => {
			const metadata = await server.getMetadata();

			expect(metadata).not.toHaveProperty('scopes_supported');
		});

		test('advertises the scopes of every registered resource', async () => {
			registry.getAllScopes.mockReturnValue(['tool:read', 'tool:write']);

			const metadata = await server.getMetadata();

			expect(metadata.scopes_supported).toEqual(['tool:read', 'tool:write']);
		});
	});

	describe('getJwks', () => {
		test('returns the published signing keys', async () => {
			jwksProvider.getPublicJwks.mockResolvedValue([signingJwk]);

			await expect(server.getJwks()).resolves.toEqual({ keys: [signingJwk] });
		});
	});

	describe('isAccessTokenActive', () => {
		test('answers from the access token rows', async () => {
			accessTokens.isActive.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

			await expect(server.isAccessTokenActive('live')).resolves.toBe(true);
			await expect(server.isAccessTokenActive('revoked')).resolves.toBe(false);
			expect(accessTokens.isActive).toHaveBeenNthCalledWith(1, 'live');
			expect(accessTokens.isActive).toHaveBeenNthCalledWith(2, 'revoked');
		});
	});
});
