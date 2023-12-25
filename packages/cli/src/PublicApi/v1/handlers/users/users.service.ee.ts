import { Container } from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';
import type { User } from '@db/entities/User';
import pick from 'lodash/pick';
import { validate as uuidValidate } from 'uuid';
import { RoleService } from '@/services/role.service';
import { randomBytes } from 'crypto';
import { randomString } from '../../shared/random';

export const getSelectableProperties = (table: 'user' | 'role'): string[] => {
	return {
		user: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt', 'isPending'],
		role: ['id', 'name', 'scope', 'createdAt', 'updatedAt'],
	}[table];
};

export async function getUser(data: {
	withIdentifier: string;
	includeRole?: boolean;
}): Promise<User | null> {
	return Container.get(UserRepository).findOne({
		where: {
			...(uuidValidate(data.withIdentifier) && { id: data.withIdentifier }),
			...(!uuidValidate(data.withIdentifier) && { email: data.withIdentifier }),
		},
		relations: data?.includeRole ? ['globalRole'] : undefined,
	});
}

export async function getAllUsersAndCount(data: {
	includeRole?: boolean;
	limit?: number;
	offset?: number;
}): Promise<[User[], number]> {
	const users = await Container.get(UserRepository).find({
		where: {},
		relations: data?.includeRole ? ['globalRole'] : undefined,
		skip: data.offset,
		take: data.limit,
	});
	const count = await Container.get(UserRepository).count();
	return [users, count];
}

export async function createUser(email: string): Promise<User | null> {
	const memberRole = await Container.get(RoleService).findGlobalMemberRole();
	const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;

	const insertResult = await Container.get(UserRepository)
		.createQueryBuilder()
		.insert()
		.values({
			email,
			apiKey,
			password: randomString(6, 16),
			globalRoleId: memberRole.id,
			isPending: false,
		})
		.execute();

	const insertedUserId = insertResult.generatedMaps[0].id as string;

	return Container.get(UserRepository).findOne({
		where: {
			id: insertedUserId,
		},
	});
}

function pickUserSelectableProperties(user: User, options?: { includeRole: boolean }) {
	return pick(
		user,
		getSelectableProperties('user').concat(options?.includeRole ? ['globalRole'] : []),
	);
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
