import type { AuthenticatedRequest, User } from '@n8n/db';
import { getApiKeyScopesForRole, type Scope as ScopeType } from '@n8n/permissions';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { PublicApiProtectedResource } from '@/public-api/public-api-protected-resource';
import { JwtService } from '@/services/jwt.service';
import type { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';
import { PublicApiOAuthStrategy } from '@/services/public-api-oauth.strategy';

const RESOURCE_URL = 'http://localhost:5678/api/v1';

const jwtService = new JwtService(mock<InstanceSettings>({ encryptionKey: 'test-key' }), mock());

/** Create a mock user with role.scopes pre-populated for scope assertions. */
function makeUser(scopeSlugs: string[] = [], disabled = false): User {
	return {
		...mock<User>(),
		disabled,
		role: {
			...mock<User['role']>(),
			scopes: scopeSlugs.map((slug) => ({ ...mock(), slug: slug as ScopeType })),
		},
	};
}

function makeOAuthToken(meta: Record<string, unknown> = { isOAuth: true }): string {
	return jwtService.sign({ sub: 'user-id', aud: RESOURCE_URL, meta });
}

function makeBearerReq(token?: string): AuthenticatedRequest {
	const req = mock<AuthenticatedRequest>();
	req.headers = (
		token ? { authorization: `Bearer ${token}` } : {}
	) as AuthenticatedRequest['headers'];
	return req;
}

describe('PublicApiOAuthStrategy', () => {
	let strategy: PublicApiOAuthStrategy;
	let oauthTokenVerifier: ReturnType<typeof mock<OAuthTokenVerifierProxy>>;
	let publicApiResource: ReturnType<typeof mock<PublicApiProtectedResource>>;

	beforeEach(() => {
		oauthTokenVerifier = mock<OAuthTokenVerifierProxy>();
		publicApiResource = mock<PublicApiProtectedResource>();
		publicApiResource.getResourceUrl.mockReturnValue(RESOURCE_URL);
		strategy = new PublicApiOAuthStrategy(jwtService, oauthTokenVerifier, publicApiResource);
	});

	describe('authenticate', () => {
		it('returns true and sets req.user + req.tokenGrant for a valid OAuth token', async () => {
			const user = makeUser(['workflow:read', 'workflow:create']);
			oauthTokenVerifier.verifyOAuthAccessToken.mockResolvedValue({ user });

			const req = makeBearerReq(makeOAuthToken());
			const result = await strategy.authenticate(req);

			expect(result).toBe(true);
			expect(req.user).toBe(user);
			expect(req.tokenGrant).toEqual({
				subject: user,
				scopes: ['workflow:read', 'workflow:create'],
				apiKeyScopes: getApiKeyScopesForRole(user),
			});
			expect(oauthTokenVerifier.verifyOAuthAccessToken).toHaveBeenCalledWith(
				expect.any(String),
				RESOURCE_URL,
			);
		});

		it('returns false when the token verifier resolves no user', async () => {
			oauthTokenVerifier.verifyOAuthAccessToken.mockResolvedValue({ user: null });

			const result = await strategy.authenticate(makeBearerReq(makeOAuthToken()));

			expect(result).toBe(false);
		});

		it('abstains (null) when there is no Authorization Bearer header', async () => {
			const result = await strategy.authenticate(makeBearerReq());

			expect(result).toBeNull();
			expect(oauthTokenVerifier.verifyOAuthAccessToken).not.toHaveBeenCalled();
		});

		it('abstains (null) for a bearer token that is not an OAuth-server token', async () => {
			const nonOAuthToken = jwtService.sign({ sub: 'user-id', meta: { isOAuth: false } });

			const result = await strategy.authenticate(makeBearerReq(nonOAuthToken));

			expect(result).toBeNull();
			expect(oauthTokenVerifier.verifyOAuthAccessToken).not.toHaveBeenCalled();
		});
	});
});
