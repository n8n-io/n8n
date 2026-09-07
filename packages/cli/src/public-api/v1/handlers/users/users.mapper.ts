import type { User } from '@n8n/db';
import pick from 'lodash/pick';

const userProperties = [
	'id',
	'email',
	'firstName',
	'lastName',
	'createdAt',
	'updatedAt',
	'isPending',
	'mfaEnabled',
] as const;

type PublicApiUser = Pick<User, (typeof userProperties)[number]> & { role?: string };

function mapToPublicApiUser(user: User, options?: { includeRole: boolean }): PublicApiUser {
	const publicApiUser = pick(user, ...userProperties);

	return options?.includeRole ? { ...publicApiUser, role: user.role?.slug } : publicApiUser;
}

export function toPublicApiUser(user: User, options?: { includeRole: boolean }): PublicApiUser;
export function toPublicApiUser(users: User[], options?: { includeRole: boolean }): PublicApiUser[];
export function toPublicApiUser(
	users: User[] | User,
	options?: { includeRole: boolean },
): PublicApiUser[] | PublicApiUser {
	return Array.isArray(users)
		? users.map((user) => mapToPublicApiUser(user, options))
		: mapToPublicApiUser(users, options);
}
