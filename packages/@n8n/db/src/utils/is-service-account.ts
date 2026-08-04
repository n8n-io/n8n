import type { User } from '../entities/user';

/**
 * Whether a principal is a non-human service account.
 *
 * Prefer this over testing `password === null`: every pre-existing "is this a
 * real human?" check in the codebase uses the password, and a service account is
 * passwordless, so those checks misclassify it.
 */
export function isServiceAccount(user: Pick<User, 'type'>): boolean {
	return user.type === 'serviceAccount';
}
