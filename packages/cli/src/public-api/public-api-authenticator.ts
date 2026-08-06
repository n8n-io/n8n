import type { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';

import { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import { PublicApiCookieAuthenticator } from '@/services/public-api-cookie-authenticator';

/**
 * The public API's request-authentication entry point.
 */
@Service()
export class PublicApiAuthenticator {
	constructor(
		private readonly authStrategyRegistry: AuthStrategyRegistry,
		private readonly cookieAuthenticator: PublicApiCookieAuthenticator,
	) {}

	async authenticate(req: AuthenticatedRequest): Promise<boolean> {
		const isAuthorizedViaApiKey = await this.authStrategyRegistry.authenticate(req);
		const isAuthorizedViaCookie = Boolean(await this.cookieAuthenticator.authenticate(req));
		return isAuthorizedViaApiKey || isAuthorizedViaCookie;
	}
}
