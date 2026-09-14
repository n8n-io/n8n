import type { UserPublicDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import pick from 'lodash/pick';

const userProperties = ['id', 'email', 'firstName', 'lastName', 'isPending', 'mfaEnabled'] as const;

function mapToPublicApiUser(user: User, options?: { includeRole: boolean }): UserPublicDto {
	const publicApiUser = {
		...pick(user, ...userProperties),
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	};

	return options?.includeRole ? { ...publicApiUser, role: user.role?.slug } : publicApiUser;
}

export function toPublicApiUser(user: User, options?: { includeRole: boolean }): UserPublicDto;
export function toPublicApiUser(users: User[], options?: { includeRole: boolean }): UserPublicDto[];
export function toPublicApiUser(
	users: User[] | User,
	options?: { includeRole: boolean },
): UserPublicDto[] | UserPublicDto {
	return Array.isArray(users)
		? users.map((user) => mapToPublicApiUser(user, options))
		: mapToPublicApiUser(users, options);
}
