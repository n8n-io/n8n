import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import type { PublicApiCookieAuthenticator } from '@/services/public-api-cookie-authenticator';

import { PublicApiAuthenticator } from '../public-api-authenticator';

describe('PublicApiAuthenticator', () => {
	const authStrategyRegistry = mock<AuthStrategyRegistry>();
	const cookieAuthenticator = mock<PublicApiCookieAuthenticator>();
	const authenticator = new PublicApiAuthenticator(authStrategyRegistry, cookieAuthenticator);

	it('returns true when the registry succeeds, without trying the cookie authenticator', async () => {
		authStrategyRegistry.authenticate.mockResolvedValue(true);

		expect(await authenticator.authenticate(mock<AuthenticatedRequest>())).toBe(true);
		expect(cookieAuthenticator.authenticate).not.toHaveBeenCalled();
	});

	it('falls through to the cookie authenticator when the registry abstains/fails', async () => {
		authStrategyRegistry.authenticate.mockResolvedValue(false);
		cookieAuthenticator.authenticate.mockResolvedValue(true);

		expect(await authenticator.authenticate(mock<AuthenticatedRequest>())).toBe(true);
	});

	it('returns false when both the registry and the cookie authenticator fail', async () => {
		authStrategyRegistry.authenticate.mockResolvedValue(false);
		cookieAuthenticator.authenticate.mockResolvedValue(false);

		expect(await authenticator.authenticate(mock<AuthenticatedRequest>())).toBe(false);
	});

	it('returns false when both abstain (no credential present)', async () => {
		authStrategyRegistry.authenticate.mockResolvedValue(false);
		cookieAuthenticator.authenticate.mockResolvedValue(null);

		expect(await authenticator.authenticate(mock<AuthenticatedRequest>())).toBe(false);
	});

	it('accepted trade-off: a request with an invalid API key header AND a valid session cookie still authenticates', async () => {
		// AuthStrategyRegistry.authenticate() collapses "a strategy explicitly failed"
		// and "all strategies abstained" into the same `false`, so an invalid API key
		// header (which makes the registry fail fast) does not block the independently
		// valid cookie from being tried here. See docs on PublicApiAuthenticator.
		authStrategyRegistry.authenticate.mockResolvedValue(false);
		cookieAuthenticator.authenticate.mockResolvedValue(true);

		expect(await authenticator.authenticate(mock<AuthenticatedRequest>())).toBe(true);
	});
});
