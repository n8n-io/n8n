import { randomEmail, randomName, randomValidPassword } from '@n8n/backend-test-utils';
import {
	AuthIdentity,
	AuthIdentityRepository,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	type Role,
	UserRepository,
} from '@n8n/db';
import { type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import { getApiKeyScopesForRole } from '@n8n/permissions';
import { hash } from 'bcryptjs';

import { MfaService } from '@/mfa/mfa.service';
import { TOTPService } from '@/mfa/totp.service';
import { PublicApiKeyService } from '@/services/public-api-key.service';
import type { DeepPartial } from '@n8n/typeorm';

type ApiKeyOptions = {
	expiresAt?: number | null;
	scopes?: ApiKeyScope[];
};

// pre-computed bcrypt hash for the string 'password', using `await hash('password', 10)`
const passwordHash = '$2a$10$njedH7S6V5898mj6p0Jr..IGY9Ms.qNwR7RbSzzX9yubJocKfvGGK';

// A null password value means that no password will be set in the database
// rendering the user as pending, an undefined value means we default
// to 'password' as password.
// Also we are hashing the plaintext password here if necessary
async function handlePasswordSetup(password: string | null | undefined): Promise<string | null> {
	if (password === undefined) {
		return passwordHash;
	} else if (password === null) {
		return null;
	}
	return await hash(password, 1);
}

/** Store a new user object, defaulting to a `member` */
export async function newUser(attributes: DeepPartial<User> = {}): Promise<User> {
	const { email, password, firstName, lastName, role, ...rest } = attributes;
	return Container.get(UserRepository).create({
		email: email ?? randomEmail(),
		password: await handlePasswordSetup(password),
		firstName: firstName ?? randomName(),
		lastName: lastName ?? randomName(),
		role: role ?? GLOBAL_MEMBER_ROLE,
		...rest,
	});
}

/** Store a user object in the DB */
export async function createUser(attributes: DeepPartial<User> = {}): Promise<User> {
	const userInstance = await newUser(attributes);
	const { user } = await Container.get(UserRepository).createUserWithProject(userInstance);
	return user;
}

export async function createLdapUser(attributes: DeepPartial<User>, ldapId: string): Promise<User> {
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

	await Container.get(UserRepository).update(user.id, {
		mfaSecret: encryptedSecret,
		mfaRecoveryCodes: encryptedRecoveryCodes,
	});

	user.mfaSecret = encryptedSecret;
	user.mfaRecoveryCodes = encryptedRecoveryCodes;

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
		scopes: scopes.length ? scopes : getApiKeyScopesForRole(user),
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
	return await createUser({ role: GLOBAL_OWNER_ROLE });
}

export async function createMember() {
	return await createUser({ role: GLOBAL_MEMBER_ROLE });
}

export async function createAdmin() {
	return await createUser({ role: GLOBAL_ADMIN_ROLE });
}

export async function createUserShell(role: Role): Promise<User> {
	const shell: DeepPartial<User> = { role };

	if (role.slug !== GLOBAL_OWNER_ROLE.slug) {
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
	attributes: DeepPartial<User> = {},
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
		relations: ['authIdentities', 'role'],
	});

export const getUserById = async (id: string) =>
	await Container.get(UserRepository).findOneOrFail({
		where: { id },
		relations: ['authIdentities', 'role'],
	});

export const getLdapIdentities = async () =>
	await Container.get(AuthIdentityRepository).find({
		where: { providerType: 'ldap' },
		relations: { user: true },
	});

export async function getGlobalOwner() {
	return await Container.get(UserRepository).findOneOrFail({
		where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
		relations: ['role'],
	});
}
