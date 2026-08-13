import type { ApiKeyAudience } from '@n8n/api-types';
import type { AuthenticatedRequest, TokenGrant } from '@n8n/db';

export type AuthStrategyOptions = {
	audience?: ApiKeyAudience;
	issuer?: string;
};

/**
 * A single authentication strategy for the public API.
 *
 * Return values:
 *   null  — strategy does not apply to this request (e.g. no matching header);
 *           the registry will try the next registered strategy.
 *   false — strategy recognises this request but authentication failed
 *           (e.g. expired key, disabled user); the registry stops immediately.
 *   true  — authentication succeeded; the strategy has set req.user
 *           (and req.tokenGrant if applicable) before returning.
 */
export interface AuthStrategy {
	authenticate(req: AuthenticatedRequest): Promise<boolean | null>;

	/**
	 * This builds the token grant based on the authentication token.
	 * @param token
	 */
	buildTokenGrant(token: string, options?: AuthStrategyOptions): Promise<TokenGrant | false | null>;
}
