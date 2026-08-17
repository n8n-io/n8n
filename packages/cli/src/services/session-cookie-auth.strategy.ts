import type { AuthenticatedRequest, TokenGrant, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { getApiKeyScopesForRole } from '@n8n/permissions';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';
import { AuthError } from '@/errors/response-errors/auth.error';

import type { AuthStrategy, AuthStrategyOptions } from './auth-strategy.types';

/**
 * Lets the public API accept the browser's `n8n-auth` session cookie as an
 * alternative to an API key.
 */
@Service()
export class SessionCookieAuthStrategy implements AuthStrategy {
	constructor(private readonly authService: AuthService) {}

	/**
	 * Session cookies authenticate a request via req.cookies, never via an arbitrary
	 * bearer token string, so this strategy has no legitimate way to answer "is this
	 * token valid for audience X". It must always abstain here, ignoring `token`/`options`
	 * entirely — otherwise a browser session JWT could satisfy an audience-scoped
	 * bearer-token check it was never meant to (e.g. McpServerApiKeyService.verifyApiKey).
	 */
	async buildTokenGrant(_token: string, _options?: AuthStrategyOptions): Promise<null> {
		return null;
	}

	async authenticate(req: AuthenticatedRequest): Promise<boolean | null> {
		const token = req.cookies[AUTH_COOKIE_NAME];
		if (!token) return null;

		try {
			const user = await this.authService.authenticateUserBasedOnToken(
				token,
				req.method,
				this.authService.getEndpoint(req),
				this.authService.getBrowserId(req),
			);

			const tokenGrant = this.toGrant(user);
			req.user = user;
			req.tokenGrant = tokenGrant;
			return true;
		} catch (error) {
			if (this.isAuthFailure(error)) return false;
			throw error;
		}
	}

	private toGrant(user: User): TokenGrant {
		return {
			scopes: user.role.scopes.map((s) => s.slug),
			subject: user,
			apiKeyScopes: getApiKeyScopesForRole(user),
		};
	}

	private isAuthFailure(error: unknown): boolean {
		return (
			error instanceof AuthError ||
			error instanceof TokenExpiredError ||
			error instanceof JsonWebTokenError
		);
	}
}
