import type { AuthenticatedRequest, User } from '@n8n/db';

/**
 * The human behind an impersonated session, or `undefined` when the caller is
 * acting as themselves.
 *
 * `req.user` remains the authorization principal in both cases — during
 * impersonation that is the service account. Use this only for attribution,
 * audit and restoring the operator's session.
 */
export function getActor(req: AuthenticatedRequest): User | undefined {
	return req.authInfo?.actor;
}

export function isImpersonating(req: AuthenticatedRequest): boolean {
	return req.authInfo?.actor !== undefined;
}
