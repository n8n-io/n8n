'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getLdapIdentities = exports.getUserById = exports.getAllUsers = exports.addApiKey = void 0;
exports.newUser = newUser;
exports.createUser = createUser;
exports.createLdapUser = createLdapUser;
exports.createUserWithMfaEnabled = createUserWithMfaEnabled;
exports.createOwnerWithApiKey = createOwnerWithApiKey;
exports.createMemberWithApiKey = createMemberWithApiKey;
exports.createAdminWithApiKey = createAdminWithApiKey;
exports.createOwner = createOwner;
exports.createMember = createMember;
exports.createAdmin = createAdmin;
exports.createUserShell = createUserShell;
exports.createManyUsers = createManyUsers;
exports.getGlobalOwner = getGlobalOwner;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const bcryptjs_1 = require('bcryptjs');
const mfa_service_1 = require('@/mfa/mfa.service');
const totp_service_1 = require('@/mfa/totp.service');
const public_api_key_service_1 = require('@/services/public-api-key.service');
const passwordHash = '$2a$10$njedH7S6V5898mj6p0Jr..IGY9Ms.qNwR7RbSzzX9yubJocKfvGGK';
async function handlePasswordSetup(password) {
	if (password === undefined) {
		return passwordHash;
	} else if (password === null) {
		return null;
	}
	return await (0, bcryptjs_1.hash)(password, 1);
}
async function newUser(attributes = {}) {
	const { email, password, firstName, lastName, role, ...rest } = attributes;
	return di_1.Container.get(db_1.UserRepository).create({
		email: email ?? (0, backend_test_utils_1.randomEmail)(),
		password: await handlePasswordSetup(password),
		firstName: firstName ?? (0, backend_test_utils_1.randomName)(),
		lastName: lastName ?? (0, backend_test_utils_1.randomName)(),
		role: role ?? 'global:member',
		...rest,
	});
}
async function createUser(attributes = {}) {
	const userInstance = await newUser(attributes);
	const { user } = await di_1.Container.get(db_1.UserRepository).createUserWithProject(
		userInstance,
	);
	return user;
}
async function createLdapUser(attributes, ldapId) {
	const user = await createUser(attributes);
	await di_1.Container.get(db_1.AuthIdentityRepository).save(
		db_1.AuthIdentity.create(user, ldapId, 'ldap'),
	);
	return user;
}
async function createUserWithMfaEnabled(data = { numberOfRecoveryCodes: 10 }) {
	const email = (0, backend_test_utils_1.randomEmail)();
	const password = (0, backend_test_utils_1.randomValidPassword)();
	const toptService = new totp_service_1.TOTPService();
	const secret = toptService.generateSecret();
	const mfaService = di_1.Container.get(mfa_service_1.MfaService);
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
	await di_1.Container.get(db_1.UserRepository).update(user.id, {
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
const addApiKey = async (user, { expiresAt = null, scopes = [] } = {}) => {
	return await di_1.Container.get(
		public_api_key_service_1.PublicApiKeyService,
	).createPublicApiKeyForUser(user, {
		label: (0, backend_test_utils_1.randomName)(),
		expiresAt,
		scopes: scopes.length ? scopes : (0, permissions_1.getApiKeyScopesForRole)(user.role),
	});
};
exports.addApiKey = addApiKey;
async function createOwnerWithApiKey({ expiresAt = null, scopes = [] } = {}) {
	const owner = await createOwner();
	const apiKey = await (0, exports.addApiKey)(owner, { expiresAt, scopes });
	owner.apiKeys = [apiKey];
	return owner;
}
async function createMemberWithApiKey({ expiresAt = null, scopes = [] } = {}) {
	const member = await createMember();
	const apiKey = await (0, exports.addApiKey)(member, { expiresAt, scopes });
	member.apiKeys = [apiKey];
	return member;
}
async function createAdminWithApiKey({ expiresAt = null, scopes = [] } = {}) {
	const member = await createAdmin();
	const apiKey = await (0, exports.addApiKey)(member, { expiresAt, scopes });
	member.apiKeys = [apiKey];
	return member;
}
async function createOwner() {
	return await createUser({ role: 'global:owner' });
}
async function createMember() {
	return await createUser({ role: 'global:member' });
}
async function createAdmin() {
	return await createUser({ role: 'global:admin' });
}
async function createUserShell(role) {
	const shell = { role };
	if (role !== 'global:owner') {
		shell.email = (0, backend_test_utils_1.randomEmail)();
	}
	const { user } = await di_1.Container.get(db_1.UserRepository).createUserWithProject(shell);
	return user;
}
async function createManyUsers(amount, attributes = {}) {
	const result = await Promise.all(
		Array(amount)
			.fill(0)
			.map(async () => {
				const userInstance = await newUser(attributes);
				return await di_1.Container.get(db_1.UserRepository).createUserWithProject(userInstance);
			}),
	);
	return result.map((result) => result.user);
}
const getAllUsers = async () =>
	await di_1.Container.get(db_1.UserRepository).find({
		relations: ['authIdentities'],
	});
exports.getAllUsers = getAllUsers;
const getUserById = async (id) =>
	await di_1.Container.get(db_1.UserRepository).findOneOrFail({
		where: { id },
		relations: ['authIdentities'],
	});
exports.getUserById = getUserById;
const getLdapIdentities = async () =>
	await di_1.Container.get(db_1.AuthIdentityRepository).find({
		where: { providerType: 'ldap' },
		relations: { user: true },
	});
exports.getLdapIdentities = getLdapIdentities;
async function getGlobalOwner() {
	return await di_1.Container.get(db_1.UserRepository).findOneByOrFail({ role: 'global:owner' });
}
//# sourceMappingURL=users.js.map
