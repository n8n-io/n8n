import Container from 'typedi';
import { hash } from 'bcryptjs';

import { AuthIdentity } from '@db/entities/AuthIdentity';
import type { AuthUser } from '@db/entities/AuthUser';
import { type GlobalRole } from '@db/entities/User';
import { AuthIdentityRepository } from '@db/repositories/authIdentity.repository';
import { AuthUserRepository } from '@db/repositories/authUser.repository';
import { TOTPService } from '@/Mfa/totp.service';
import { MfaService } from '@/Mfa/mfa.service';

import { randomApiKey, randomEmail, randomName, randomValidPassword } from '../random';

// pre-computed bcrypt hash for the string 'password', using `await hash('password', 10)`
const passwordHash = '$2a$10$njedH7S6V5898mj6p0Jr..IGY9Ms.qNwR7RbSzzX9yubJocKfvGGK';

/** Store a new user object, defaulting to a `member` */
export async function newUser(attributes: Partial<AuthUser> = {}): Promise<AuthUser> {
	const { email, password, firstName, lastName, role, ...rest } = attributes;
	return Container.get(AuthUserRepository).create({
		email: email ?? randomEmail(),
		password: password ? await hash(password, 1) : passwordHash,
		firstName: firstName ?? randomName(),
		lastName: lastName ?? randomName(),
		role: role ?? 'global:member',
		...rest,
	});
}

/** Store a user object in the DB */
export async function createUser(attributes: Partial<AuthUser> = {}): Promise<AuthUser> {
	const userInstance = await newUser(attributes);
	const { user } = await Container.get(AuthUserRepository).createUserWithProject(userInstance);
	user.computeIsOwner();
	return user;
}

export async function createLdapUser(
	attributes: Partial<AuthUser>,
	ldapId: string,
): Promise<AuthUser> {
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

	const user = await createUser({
		mfaEnabled: true,
		password,
		email,
	});

	await Container.get(AuthUserRepository).update(user.id, {
		mfaSecret: encryptedSecret,
		mfaRecoveryCodes: encryptedRecoveryCodes,
	});

	return {
		user,
		rawPassword: password,
		rawSecret: secret,
		rawRecoveryCodes: recoveryCodes,
	};
}

export async function createOwner() {
	return await createUser({ role: 'global:owner' });
}

export async function createMember() {
	return await createUser({ role: 'global:member' });
}

export async function createAdmin() {
	return await createUser({ role: 'global:admin' });
}

export async function createUserShell(role: GlobalRole): Promise<AuthUser> {
	const shell: Partial<AuthUser> = { role };

	if (role !== 'global:owner') {
		shell.email = randomEmail();
	}

	const { user } = await Container.get(AuthUserRepository).createUserWithProject(shell);
	return user;
}

/**
 * Create many users in the DB, defaulting to a `member`.
 */
export async function createManyUsers(
	amount: number,
	attributes: Partial<AuthUser> = {},
): Promise<AuthUser[]> {
	const result = await Promise.all(
		Array(amount)
			.fill(0)
			.map(async () => {
				const userInstance = await newUser(attributes);
				return await Container.get(AuthUserRepository).createUserWithProject(userInstance);
			}),
	);
	return result.map((result) => result.user);
}

export async function addApiKey(user: AuthUser): Promise<AuthUser> {
	user.apiKey = randomApiKey();
	return await Container.get(AuthUserRepository).save(user);
}

export const getAllUsers = async () =>
	await Container.get(AuthUserRepository).find({
		relations: ['authIdentities'],
	});

export const getUserById = async (id: string) =>
	await Container.get(AuthUserRepository).findOneOrFail({
		where: { id },
		relations: ['authIdentities'],
	});

export const getLdapIdentities = async () =>
	await Container.get(AuthIdentityRepository).find({
		where: { providerType: 'ldap' },
		relations: { user: true },
	});

export async function getGlobalOwner() {
	return await Container.get(AuthUserRepository).findOneByOrFail({ role: 'global:owner' });
}
