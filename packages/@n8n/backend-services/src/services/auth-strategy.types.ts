import type { ApiKeyAudience } from '@n8n/api-types';
import type { AuthenticatedRequest, TokenGrant } from '@n8n/db';

export type AuthStrategyOptions = {
	audience?: ApiKeyAudience;
	issuer?: string;
};

/**
 * What one strategy decided for a request.
 * `challenge` is an RFC 7235 challenge, for example `Bearer resource_metadata="…"`. The registry
 * collects the challenges of every strategy it asked, and the 401 carries them. A strategy sets it
 * when it abstained because its credential was absent, or when it rejected the credential it owns.
 */
export type AuthStrategyResult =
	| { outcome: 'authenticated' }
	| { outcome: 'rejected'; challenge?: string }
	| { outcome: 'abstained'; challenge?: string };

/**
 * A single authentication strategy for the public API.
 *
 * Outcomes of `authenticate`:
 *   abstained     — the strategy does not apply to this request (e.g. no matching header);
 *                   the registry will try the next registered strategy.
 *   rejected      — the strategy recognises this request but authentication failed
 *                   (e.g. expired key, disabled user); the registry stops immediately.
 *   authenticated — authentication succeeded; the strategy has set req.user
 *                   (and req.tokenGrant if applicable) before returning.
 */
export interface AuthStrategy {
	authenticate(req: AuthenticatedRequest): Promise<AuthStrategyResult>;

	/**
	 * This builds the token grant based on the authentication token.
	 * @param token
	 */
	buildTokenGrant(token: string, options?: AuthStrategyOptions): Promise<TokenGrant | false | null>;
}
