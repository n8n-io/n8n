import type { ApiKeyAudience } from '@n8n/api-types';
import type { AuthenticatedRequest, TokenGrant } from '@n8n/db';

export type AuthStrategyOptions = {
	audience?: ApiKeyAudience;
	issuer?: string;
};

/**
 * What one strategy decided for a request.
 * A `rejected` outcome may carry an RFC 7235 challenge specific to the refused credential, for
 * example `Bearer …, error="invalid_token"`. The strategy's generic challenge comes from
 * `AuthStrategy.challenge` instead.
 */
export type AuthStrategyResult =
	| { outcome: 'authenticated' }
	| { outcome: 'rejected'; challenge?: string }
	| { outcome: 'abstained' };

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
	 * The RFC 7235 challenge for a 401 on this request, for example `Bearer resource_metadata="…"`.
	 * The registry asks every registered strategy on every 401, also the ones it never asked to
	 * authenticate, unless the strategy rejected with a challenge of its own. Keep it cheap and
	 * free of side effects.
	 */
	challenge?(req: AuthenticatedRequest): Promise<string | undefined>;

	/**
	 * This builds the token grant based on the authentication token.
	 * @param token
	 */
	buildTokenGrant(token: string, options?: AuthStrategyOptions): Promise<TokenGrant | false | null>;
}
