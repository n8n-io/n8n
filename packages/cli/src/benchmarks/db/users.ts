/**
 * @TODO Deduplicate with packages/cli/test/integration/shared/db/users.ts
 */

import Container from 'typedi';
import type { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import { IsNull } from '@n8n/typeorm';

// pre-computed bcrypt hash for the string 'password', using `await hash('password', 10)`
const passwordHash = '$2a$10$njedH7S6V5898mj6p0Jr..IGY9Ms.qNwR7RbSzzX9yubJocKfvGGK';

/** Store a new user object, defaulting to a `member` */
export async function newUser(attributes: Partial<User> = {}): Promise<User> {
	const { email, password, firstName, lastName, role, ...rest } = attributes;
	return Container.get(UserRepository).create({
		email: 'test@test.com',
		password: passwordHash,
		firstName: 'John',
		lastName: 'Smith',
		role: role ?? 'global:member',
		...rest,
	});
}

/** Store a user object in the DB */
export async function createUser(attributes: Partial<User> = {}): Promise<User> {
	const user = await newUser(attributes);
	user.computeIsOwner();
	return await Container.get(UserRepository).save(user);
}

export async function createOwner() {
	return await createUser({ role: 'global:owner' });
}

export async function createMember() {
	return await createUser({ role: 'global:member' });
}

export async function deleteOwnerShell() {
	await Container.get(UserRepository).delete({ role: 'global:owner', email: IsNull() });
}

export const getAllUsers = async () =>
	await Container.get(UserRepository).find({
		relations: ['authIdentities'],
	});
