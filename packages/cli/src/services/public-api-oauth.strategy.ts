import type { AuthenticatedRequest, TokenGrant } from '@n8n/db';
import { Service } from '@n8n/di';
import { getApiKeyScopesForRole } from '@n8n/permissions';

import { PublicApiProtectedResource } from '@/public-api/public-api-protected-resource';

import type { AuthStrategy } from './auth-strategy.types';
import { JwtService } from './jwt.service';
import { OAuthTokenVerifierProxy } from './oauth-token-verifier-proxy.service';

const BEARER_PREFIX = 'Bearer ';

/** Minimal shape of an OAuth-server access token needed to recognise one. */
interface OAuthAccessTokenPayload {
	meta?: { isOAuth?: boolean };
}

/**
 * Authenticates the public REST API with access tokens minted by the instance's
 * shared OAuth server (service-account client_credentials tokens).
 *
 * Registered after `ApiKeyAuthStrategy`, so it only sees bearer tokens that are
 * not `x-n8n-api-key`s. It abstains (returns `null`) for anything that is not an
 * OAuth-server token, letting other bearer schemes fall through cleanly.
 */
@Service()
export class PublicApiOAuthStrategy implements AuthStrategy {
	constructor(
		private readonly jwtService: JwtService,
		private readonly oauthTokenVerifier: OAuthTokenVerifierProxy,
		private readonly publicApiResource: PublicApiProtectedResource,
	) {}

	async buildTokenGrant(token: string): Promise<TokenGrant | false | null> {
		if (!token || !this.isOAuthToken(token)) return null;

		const result = await this.oauthTokenVerifier.verifyOAuthAccessToken(
			token,
			this.publicApiResource.getResourceUrl(),
		);
		if (!result.user) return false;

		return {
			subject: result.user,
			scopes: result.user.role?.scopes?.map((scope) => scope.slug) ?? [],
			// Public-API routes gate on `apiKeyScopes`; derive them from the user's
			// role, same as ScopedJwtStrategy. Without this every route 403s.
			apiKeyScopes: getApiKeyScopesForRole(result.user),
		};
	}

	async authenticate(req: AuthenticatedRequest): Promise<boolean | null> {
		const token = this.extractToken(req);
		if (!token) return null;

		const tokenGrant = await this.buildTokenGrant(token);
		if (tokenGrant === false || tokenGrant === null) {
			return tokenGrant;
		}

		req.tokenGrant = tokenGrant;
		req.user = tokenGrant.subject;

		return true;
	}

	/**
	 * Decode (unverified) to check the `meta.isOAuth` marker minted by the OAuth
	 * server. Abstaining here rather than failing keeps API keys and other bearer
	 * schemes falling through to the next strategy; the signature is verified
	 * downstream by the OAuth token verifier.
	 */
	private isOAuthToken(token: string): boolean {
		const decoded = this.jwtService.decode<OAuthAccessTokenPayload | null>(token);
		return decoded?.meta?.isOAuth === true;
	}

	private extractToken(req: AuthenticatedRequest): string | null {
		const authHeader = req.headers.authorization;
		if (typeof authHeader === 'string' && authHeader.startsWith(BEARER_PREFIX)) {
			const token = authHeader.slice(BEARER_PREFIX.length).trim();
			if (token) return token;
		}
		return null;
	}
}
