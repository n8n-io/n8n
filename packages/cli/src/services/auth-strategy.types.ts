import type { AuthenticatedRequest } from '@n8n/db';

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
}
