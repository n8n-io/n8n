import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import pick from 'lodash/pick';
import { validate as uuidValidate } from 'uuid';

export async function getUser(data: {
	withIdentifier: string;
	includeRole?: boolean;
}): Promise<(User & { role?: string }) | null> {
	return await Container.get(UserRepository)
		.findOne({
			where: {
				...(uuidValidate(data.withIdentifier) && { id: data.withIdentifier }),
				...(!uuidValidate(data.withIdentifier) && { email: data.withIdentifier }),
			},
			relations: ['role'],
		})
		.then((user) => {
			if (!user) return null;

			if (!data?.includeRole) delete (user as Partial<User>).role;

			return { ...user, role: user.role?.slug } as User & { role: string | null };
		});
}

export async function getAllUsersAndCount(data: {
	includeRole?: boolean;
	limit?: number;
	offset?: number;
	in?: string[];
}): Promise<[Array<User & { role?: string }>, number]> {
	const { in: _in } = data;

	const users = await Container.get(UserRepository).find({
		where: { ...(_in && { id: In(_in) }) },
		skip: data.offset,
		take: data.limit,
		relations: ['role'],
	});
	if (!data?.includeRole) {
		users.forEach((user) => {
			delete (user as Partial<User>).role;
		});
	}
	const count = await Container.get(UserRepository).count();
	return [
		users.map((user) => ({ ...user, role: user.role?.slug }) as User & { role?: string }),
		count,
	];
}

const userProperties = [
	'id',
	'email',
	'firstName',
	'lastName',
	'createdAt',
	'updatedAt',
	'isPending',
];
function pickUserSelectableProperties(user: User, options?: { includeRole: boolean }) {
	return pick(user, userProperties.concat(options?.includeRole ? ['role'] : []));
}

export function clean(user: User, options?: { includeRole: boolean }): Partial<User>;
export function clean(users: User[], options?: { includeRole: boolean }): Array<Partial<User>>;

export function clean(
	users: User[] | User,
	options?: { includeRole: boolean },
): Array<Partial<User>> | Partial<User> {
	return Array.isArray(users)
		? users.map((user) => pickUserSelectableProperties(user, options))
		: pickUserSelectableProperties(users, options);
}
