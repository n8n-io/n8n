import { Container } from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';
import { User } from '@db/entities/User';
import pick from 'lodash/pick';
import { validate as uuidValidate } from 'uuid';
import { PasswordUtility } from '@/services/password.utility';
import type { UserRequest } from '@/requests';
import * as Db from '@/Db';

export async function getUser(data: {
	withIdentifier: string;
	includeRole?: boolean;
}): Promise<User | null> {
	return await Container.get(UserRepository)
		.findOne({
			where: {
				...(uuidValidate(data.withIdentifier) && { id: data.withIdentifier }),
				...(!uuidValidate(data.withIdentifier) && { email: data.withIdentifier }),
			},
		})
		.then((user) => {
			if (user && !data?.includeRole) delete (user as Partial<User>).role;
			return user;
		});
}

export async function getAllUsersAndCount(data: {
	includeRole?: boolean;
	limit?: number;
	offset?: number;
}): Promise<[User[], number]> {
	const users = await Container.get(UserRepository).find({
		where: {},
		skip: data.offset,
		take: data.limit,
	});
	if (!data?.includeRole) {
		users.forEach((user) => {
			delete (user as Partial<User>).role;
		});
	}
	const count = await Container.get(UserRepository).count();
	return [users, count];
}

export async function createUser(properties: UserRequest.UserCreateProperties): Promise<User> {
	const newUser = new User();

	Object.assign(newUser, {
		...properties,
		role: 'global:member',
		password: await Container.get(PasswordUtility).hash(properties.password),
	});

	return newUser;
}

export async function saveUser(user: User): Promise<User> {
	// TODO: is there a hook we need to run?
	// await Container.get(ExternalHooks).run('user.create', [user]);

	return await Db.transaction(async (transactionManager) => {
		const savedUser = await transactionManager.save<User>(user);

		return savedUser;
	});
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
