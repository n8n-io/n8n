import { isPerson, type User } from '@n8n/db';

import type { UserLike } from '@/types/user-like.types';

/** The fields an event carries about an account. A service account has no email or name. */
export function toUserLike(user: User): UserLike & Pick<User, 'role'> {
	const { id, role } = user;
	if (!isPerson(user)) return { id, role };

	const { email, firstName, lastName } = user;
	return { id, email, firstName, lastName, role };
}
