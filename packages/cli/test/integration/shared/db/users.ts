import { Container } from '@n8n/di';
import type { ApiKeyScope, GlobalRole } from '@n8n/permissions';
import { hash } from 'bcryptjs';

import { AuthIdentity } from '@/databases/entities/auth-identity';
import { type User } from '@/databases/entities/user';
import { AuthIdentityRepository } from '@/databases/repositories/auth-identity.repository';
import { AuthUserRepository } from '@/databases/repositories/auth-user.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { MfaService } from '@/mfa/mfa.service';
import { TOTPService } from '@/mfa/totp.service';
import { getApiKeyScopesForRole } from '@/public-api/permissions.ee';
import { PublicApiKeyService } from '@/services/public-api-key.service';

import { randomEmail, randomName, randomValidPassword } from '../random';

type ApiKeyOptions = {
	expiresAt?: number | null;
	scopes?: ApiKeyScope[];
};

// pre-computed bcrypt hash for the string 'password', using `await hash('password', 10)`
const passwordHash = '$2a$10$njedH7S6V5898mj6p0Jr..IGY9Ms.qNwR7RbSzzX9yubJocKfvGGK';

/** Store a new user object, defaulting to a `member` */
export async function newUser(attributes: Partial<User> = {}): Promise<User> {
	const { email, password, firstName, lastName, role, ...rest } = attributes;
	return Container.get(UserRepository).create({
		email: email ?? randomEmail(),
		password: password ? await hash(password, 1) : passwordHash,
		firstName: firstName ?? randomName(),
		lastName: lastName ?? randomName(),
		role: role ?? 'global:member',
		...rest,
	});
}

/** Store a user object in the DB */
export async function createUser(attributes: Partial<User> = {}): Promise<User> {
	const userInstance = await newUser(attributes);
	const { user } = await Container.get(UserRepository).createUserWithProject(userInstance);
	user.computeIsOwner();
	return user;
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

export const addApiKey = async (
	user: User,
	{ expiresAt = null, scopes = [] }: { expiresAt?: number | null; scopes?: ApiKeyScope[] } = {},
) => {
	return await Container.get(PublicApiKeyService).createPublicApiKeyForUser(user, {
		label: randomName(),
		expiresAt,
		scopes: scopes.length ? scopes : getApiKeyScopesForRole(user.role),
	});
};

export async function createOwnerWithApiKey({ expiresAt = null, scopes = [] }: ApiKeyOptions = {}) {
	const owner = await createOwner();
	const apiKey = await addApiKey(owner, { expiresAt, scopes });
	owner.apiKeys = [apiKey];
	return owner;
}

export async function createMemberWithApiKey({
	expiresAt = null,
	scopes = [],
}: ApiKeyOptions = {}) {
	const member = await createMember();
	const apiKey = await addApiKey(member, { expiresAt, scopes });
	member.apiKeys = [apiKey];
	return member;
}

export async function createAdminWithApiKey({ expiresAt = null, scopes = [] }: ApiKeyOptions = {}) {
	const member = await createAdmin();
	const apiKey = await addApiKey(member, { expiresAt, scopes });
	member.apiKeys = [apiKey];
	return member;
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

export async function createUserShell(role: GlobalRole): Promise<User> {
	const shell: Partial<User> = { role };

	if (role !== 'global:owner') {
		shell.email = randomEmail();
	}

	const { user } = await Container.get(UserRepository).createUserWithProject(shell);
	return user;
}

/**
 * Create many users in the DB, defaulting to a `member`.
 */
export async function createManyUsers(
	amount: number,
	attributes: Partial<User> = {},
): Promise<User[]> {
	const result = await Promise.all(
		Array(amount)
			.fill(0)
			.map(async () => {
				const userInstance = await newUser(attributes);
				return await Container.get(UserRepository).createUserWithProject(userInstance);
			}),
	);
	return result.map((result) => result.user);
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
		relations: { user: true },
	});

export async function getGlobalOwner() {
	return await Container.get(UserRepository).findOneByOrFail({ role: 'global:owner' });
}
