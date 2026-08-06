import type { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';

import { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import { PublicApiCookieAuthenticator } from '@/services/public-api-cookie-authenticator';

/**
 * The public API's request-authentication entry point. Unlike `AuthStrategyRegistry`
 * — which is the shared, pluggable home for audience-scoped bearer-token strategies
 * (`ApiKeyAuthStrategy`, always registered; `ScopedJwtStrategy`, registered only if
 * token-exchange is configured) — public API auth is always available and always
 * needs to accept a browser session cookie as an alternative to those. This class
 * composes the two rather than folding the cookie authenticator into the registry.
 */
@Service()
export class PublicApiAuthenticator {
	constructor(
		private readonly authStrategyRegistry: AuthStrategyRegistry,
		private readonly cookieAuthenticator: PublicApiCookieAuthenticator,
	) {}

	async authenticate(req: AuthenticatedRequest): Promise<boolean> {
		return (
			(await this.authStrategyRegistry.authenticate(req)) ||
			Boolean(await this.cookieAuthenticator.authenticate(req))
		);
	}
}
