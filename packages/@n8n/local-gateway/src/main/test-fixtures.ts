import { vi } from 'vitest';

import type { OAuthFlow } from './oauth/oauth-flow';

/**
 * A minimal signed-in `OAuthFlow` double for tests; pass `instanceUrl: null` or
 * `token: null` to simulate a signed-out session.
 */
export function makeOAuth(
	opts: { instanceUrl?: string | null; token?: string | null } = {},
): OAuthFlow {
	return {
		getStatus: () => ({
			state: 'signedIn',
			instanceUrl: opts.instanceUrl === undefined ? 'https://n.example' : opts.instanceUrl,
			lastInstanceUrl: null,
			error: null,
		}),
		getValidAccessToken: vi.fn().mockResolvedValue(opts.token === undefined ? 'tok' : opts.token),
	} as unknown as OAuthFlow;
}
