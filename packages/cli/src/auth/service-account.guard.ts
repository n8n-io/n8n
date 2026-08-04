import type { User } from '@n8n/db';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * Reject a service-account principal from a human-only flow.
 *
 * Every pre-existing "is this a real human?" test in the codebase is
 * `password != null`, and a service account is passwordless — so those tests
 * misclassify SAs in both directions. Use this instead of testing `password`.
 *
 * Deliberately a named helper at named call sites rather than middleware:
 * impersonation needs the SA principal to reach nearly every endpoint, so a
 * blanket check would break the feature.
 *
 * @param action Completes the sentence "Service accounts cannot …".
 */
export function assertNotServiceAccount(user: Pick<User, 'type'>, action: string): void {
	if (user.type !== 'serviceAccount') return;
	throw new ForbiddenError(`Service accounts cannot ${action}`);
}
