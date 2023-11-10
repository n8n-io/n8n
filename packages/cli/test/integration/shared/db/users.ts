import Container from 'typedi';
import { hash } from 'bcryptjs';
import { AuthIdentity } from '@db/entities/AuthIdentity';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { AuthIdentityRepository } from '@db/repositories/authIdentity.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { TOTPService } from '@/Mfa/totp.service';
import { MfaService } from '@/Mfa/mfa.service';

import { randomApiKey, randomEmail, randomName, randomValidPassword } from '../random';
import { getGlobalMemberRole, getGlobalOwnerRole } from './roles';

/**
 * Store a user in the DB, defaulting to a `member`.
 */
export async function createUser(attributes: Partial<User> = {}): Promise<User> {
	const { email, password, firstName, lastName, globalRole, ...rest } = attributes;
	const user: Partial<User> = {
		email: email ?? randomEmail(),
		password: await hash(password ?? randomValidPassword(), 10),
		firstName: firstName ?? randomName(),
		lastName: lastName ?? randomName(),
		globalRoleId: (globalRole ?? (await getGlobalMemberRole())).id,
		globalRole,
		...rest,
	};

	return Container.get(UserRepository).save(user);
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
	return createUser({ globalRole: await getGlobalOwnerRole() });
}

export async function createMember() {
	return createUser({ globalRole: await getGlobalMemberRole() });
}

export async function createUserShell(globalRole: Role): Promise<User> {
	if (globalRole.scope !== 'global') {
		throw new Error(`Invalid role received: ${JSON.stringify(globalRole)}`);
	}

	const shell: Partial<User> = { globalRoleId: globalRole.id };

	if (globalRole.name !== 'owner') {
		shell.email = randomEmail();
	}

	return Container.get(UserRepository).save(shell);
}

/**
 * Create many users in the DB, defaulting to a `member`.
 */
export async function createManyUsers(
	amount: number,
	attributes: Partial<User> = {},
): Promise<User[]> {
	let { email, password, firstName, lastName, globalRole, ...rest } = attributes;
	if (!globalRole) {
		globalRole = await getGlobalMemberRole();
	}

	const users = await Promise.all(
		[...Array(amount)].map(async () =>
			Container.get(UserRepository).create({
				email: email ?? randomEmail(),
				password: await hash(password ?? randomValidPassword(), 10),
				firstName: firstName ?? randomName(),
				lastName: lastName ?? randomName(),
				globalRole,
				...rest,
			}),
		),
	);

	return Container.get(UserRepository).save(users);
}

export async function addApiKey(user: User): Promise<User> {
	user.apiKey = randomApiKey();
	return Container.get(UserRepository).save(user);
}

export const getAllUsers = async () =>
	Container.get(UserRepository).find({
		relations: ['globalRole', 'authIdentities'],
	});

export const getLdapIdentities = async () =>
	Container.get(AuthIdentityRepository).find({
		where: { providerType: 'ldap' },
		relations: ['user'],
	});
