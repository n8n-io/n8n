import Container from 'typedi';
import { hash } from 'bcryptjs';
import { AuthIdentity } from '@db/entities/AuthIdentity';
import type { GlobalRole, User } from '@db/entities/User';
import { AuthIdentityRepository } from '@db/repositories/authIdentity.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { TOTPService } from '@/Mfa/totp.service';
import { MfaService } from '@/Mfa/mfa.service';

import { randomApiKey, randomEmail, randomName, randomValidPassword } from '../random';

/**
 * Store a user in the DB, defaulting to a `member`.
 */
export async function createUser(attributes: Partial<User> = {}): Promise<User> {
	const { email, password, firstName, lastName, role, ...rest } = attributes;
	const user = Container.get(UserRepository).create({
		email: email ?? randomEmail(),
		password: await hash(password ?? randomValidPassword(), 10),
		firstName: firstName ?? randomName(),
		lastName: lastName ?? randomName(),
		role: role ?? 'member',
		...rest,
	});
	user.computeIsOwner();

	return await Container.get(UserRepository).save(user);
}

export async function createLdapUser(attributes: Partial<User>, ldapId: string): Promise<User> {
	const user = await createUser(attributes);
	await Container.get(AuthIdentityRepository).save(AuthIdentity.create(user, ldapId, 'ldap'));
	return user;
}

export async function createUserWithMfaEnabled(
	data: { numberOfRecoveryCodes: number } = { numberOfRecoveryCodes: 10 },
) {
	const email = randomEmail();
	const password = randomValidPassword();

	const toptService = new TOTPService();

	const secret = toptService.generateSecret();

	const mfaService = Container.get(MfaService);

	const recoveryCodes = mfaService.generateRecoveryCodes(data.numberOfRecoveryCodes);

	const { encryptedSecret, encryptedRecoveryCodes } = mfaService.encryptSecretAndRecoveryCodes(
		secret,
		recoveryCodes,
	);

	return {
		user: await createUser({
			mfaEnabled: true,
			password,
			email,
			mfaSecret: encryptedSecret,
			mfaRecoveryCodes: encryptedRecoveryCodes,
		}),
		rawPassword: password,
		rawSecret: secret,
		rawRecoveryCodes: recoveryCodes,
	};
}

export async function createOwner() {
	return await createUser({ role: 'owner' });
}

export async function createMember() {
	return await createUser({ role: 'member' });
}

export async function createAdmin() {
	return await createUser({ role: 'admin' });
}

export async function createUserShell(role: GlobalRole): Promise<User> {
	const shell: Partial<User> = { role };

	if (role !== 'owner') {
		shell.email = randomEmail();
	}

	return await Container.get(UserRepository).save(shell);
}

/**
 * Create many users in the DB, defaulting to a `member`.
 */
export async function createManyUsers(
	amount: number,
	attributes: Partial<User> = {},
): Promise<User[]> {
	let { email, password, firstName, lastName, role, ...rest } = attributes;

	const users = await Promise.all(
		[...Array(amount)].map(async () =>
			Container.get(UserRepository).create({
				email: email ?? randomEmail(),
				password: await hash(password ?? randomValidPassword(), 10),
				firstName: firstName ?? randomName(),
				lastName: lastName ?? randomName(),
				role: role ?? 'member',
				...rest,
			}),
		),
	);

	return await Container.get(UserRepository).save(users);
}

export async function addApiKey(user: User): Promise<User> {
	user.apiKey = randomApiKey();
	return await Container.get(UserRepository).save(user);
}

export const getAllUsers = async () =>
	await Container.get(UserRepository).find({
		relations: ['authIdentities'],
	});

export const getUserById = async (id: string) =>
	await Container.get(UserRepository).findOneOrFail({
		where: { id },
		relations: ['authIdentities'],
	});

export const getLdapIdentities = async () =>
	await Container.get(AuthIdentityRepository).find({
		where: { providerType: 'ldap' },
		relations: ['user'],
	});
