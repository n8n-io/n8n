/* eslint-disable @typescript-eslint/no-use-before-define */
import { AES, enc } from 'crypto-js';
import type { Entry as LdapUser } from 'ldapts';
import { Filter } from 'ldapts/filters/Filter';
import { UserSettings } from 'n8n-core';
import { validate } from 'jsonschema';
import * as Db from '@/Db';
import config from '@/config';
import type { Role } from '@db/entities/Role';
import { User } from '@db/entities/User';
import { AuthIdentity } from '@/databases/entities/AuthIdentity';
import type { AuthProviderSyncHistory } from '@db/entities/AuthProviderSyncHistory';
import { isUserManagementEnabled } from '@/UserManagement/UserManagementHelper';
import { LdapManager } from './LdapManager.ee';

import {
	BINARY_AD_ATTRIBUTES,
	LDAP_CONFIG_SCHEMA,
	LDAP_ENABLED,
	LDAP_FEATURE_NAME,
	LDAP_LOGIN_ENABLED,
	LDAP_LOGIN_LABEL,
} from './constants';
import type { ConnectionSecurity, LdapConfig } from './types';
import { InternalHooksManager } from '@/InternalHooksManager';
import { jsonParse, LoggerProxy as Logger } from 'n8n-workflow';
import { getLicense } from '@/License';

/**
 *  Check whether the LDAP feature is disabled in the instance
 */
export const isLdapEnabled = (): boolean => {
	const license = getLicense();
	return isUserManagementEnabled() && (config.getEnv(LDAP_ENABLED) || license.isLdapEnabled());
};

/**
 * 	Check whether the LDAP feature is enabled in the instance
 */
export const isLdapDisabled = (): boolean => !isLdapEnabled();

/**
 * Set the LDAP login label to the configuration object
 */
export const setLdapLoginLabel = (value: string): void => {
	config.set(LDAP_LOGIN_LABEL, value);
};

/**
 * Set the LDAP login enabled to the configuration object
 */
export const setLdapLoginEnabled = (value: boolean): void => {
	config.set(LDAP_LOGIN_ENABLED, value);
};

/**
 * Retrieve the LDAP login label from the configuration object
 */
export const getLdapLoginLabel = (): string => config.getEnv(LDAP_LOGIN_LABEL);

/**
 * Retrieve the LDAP login enabled from the configuration object
 */
export const isLdapLoginEnabled = (): boolean => config.getEnv(LDAP_LOGIN_ENABLED);

/**
 * Return a random password to be assigned to the LDAP users
 */
export const randomPassword = (): string => {
	return Math.random().toString(36).slice(-8);
};

/**
 * Return the user role to be assigned to LDAP users
 */
export const getLdapUserRole = async (): Promise<Role> => {
	return Db.collections.Role.findOneByOrFail({ scope: 'global', name: 'member' });
};

/**
 * Validate the structure of the LDAP configuration schema
 */
export const validateLdapConfigurationSchema = (
	ldapConfig: LdapConfig,
): { valid: boolean; message: string } => {
	const { valid, errors } = validate(ldapConfig, LDAP_CONFIG_SCHEMA, { nestedErrors: true });

	let message = '';
	if (!valid) {
		message = errors.map((error) => `request.body.${error.path[0]} ${error.message}`).join(',');
	}
	return { valid, message };
};

/**
 * Encrypt password using the instance's encryption key
 */
export const encryptPassword = async (password: string): Promise<string> => {
	const encryptionKey = await UserSettings.getEncryptionKey();
	return AES.encrypt(password, encryptionKey).toString();
};

/**
 * Decrypt password using the instance's encryption key
 */
export const decryptPassword = async (password: string): Promise<string> => {
	const encryptionKey = await UserSettings.getEncryptionKey();
	return AES.decrypt(password, encryptionKey).toString(enc.Utf8);
};

/**
 * Retrieve the LDAP configuration (decrypted) form the database
 */
export const getLdapConfig = async (): Promise<LdapConfig> => {
	const configuration = await Db.collections.Settings.findOneByOrFail({
		key: LDAP_FEATURE_NAME,
	});
	const configurationData = jsonParse<LdapConfig>(configuration.value);
	configurationData.bindingAdminPassword = await decryptPassword(
		configurationData.bindingAdminPassword,
	);
	return configurationData;
};

/**
 * Take the LDAP configuration and set login enabled and login label to the config object
 */
export const setGlobalLdapConfigVariables = (ldapConfig: LdapConfig): void => {
	setLdapLoginEnabled(ldapConfig.loginEnabled);
	setLdapLoginLabel(ldapConfig.loginLabel);
};

const resolveEntryBinaryAttributes = (entry: LdapUser): LdapUser => {
	Object.entries(entry)
		.filter(([k]) => BINARY_AD_ATTRIBUTES.includes(k))
		.forEach(([k]) => {
			entry[k] = (entry[k] as Buffer).toString('hex');
		});
	return entry;
};

export const resolveBinaryAttributes = (entries: LdapUser[]): void => {
	entries.forEach((entry) => resolveEntryBinaryAttributes(entry));
};

/**
 * Update the LDAP configuration in the database
 */
export const updateLdapConfig = async (ldapConfig: LdapConfig): Promise<void> => {
	const { valid, message } = validateLdapConfigurationSchema(ldapConfig);

	if (!valid) {
		throw new Error(message);
	}

	LdapManager.updateConfig({ ...ldapConfig });

	ldapConfig.bindingAdminPassword = await encryptPassword(ldapConfig.bindingAdminPassword);

	if (!ldapConfig.loginEnabled) {
		ldapConfig.synchronizationEnabled = false;
		const ldapUsers = await getLdapUsers();
		if (ldapUsers.length) {
			await deleteAllLdapIdentities();
			void InternalHooksManager.getInstance().onLdapUsersDisabled({
				reason: 'ldap_update',
				users: ldapUsers.length,
				user_ids: ldapUsers.map((user) => user.id),
			});
		}
	}

	await Db.collections.Settings.update(
		{ key: LDAP_FEATURE_NAME },
		{ value: JSON.stringify(ldapConfig), loadOnStartup: true },
	);
	setGlobalLdapConfigVariables(ldapConfig);
};

/**
 * Handle the LDAP initialization.
 * If it's the first run of this feature, all the default data is created in the database
 */
export const handleLdapInit = async (): Promise<void> => {
	if (!isLdapEnabled()) {
		const ldapUsers = await getLdapUsers();
		if (ldapUsers.length) {
			void InternalHooksManager.getInstance().onLdapUsersDisabled({
				reason: 'ldap_feature_deactivated',
				users: ldapUsers.length,
				user_ids: ldapUsers.map((user) => user.id),
			});
		}
		return;
	}

	const ldapConfig = await getLdapConfig();

	setGlobalLdapConfigVariables(ldapConfig);

	// init LDAP manager with the current
	// configuration
	LdapManager.init(ldapConfig);
};

export const createFilter = (filter: string, userFilter: string) => {
	let _filter = `(&(|(objectClass=person)(objectClass=user))${filter})`;
	if (userFilter) {
		_filter = `(&${userFilter}${filter}`;
	}
	return _filter;
};

export const escapeFilter = (filter: string): string => {
	//@ts-ignore
	return new Filter().escape(filter); /* eslint-disable-line */
};

/**
 * Find and authenticate user in the LDAP server.
 */
export const findAndAuthenticateLdapUser = async (
	loginId: string,
	password: string,
	loginIdAttribute: string,
	userFilter: string,
): Promise<LdapUser | undefined> => {
	const ldapService = LdapManager.getInstance().service;

	// Search for the user with the administrator binding using the
	// the Login ID attribute and whatever was inputted in the UI's
	// email input.
	let searchResult: LdapUser[] = [];

	try {
		searchResult = await ldapService.searchWithAdminBinding(
			createFilter(`(${loginIdAttribute}=${escapeFilter(loginId)})`, userFilter),
		);
	} catch (e) {
		if (e instanceof Error) {
			void InternalHooksManager.getInstance().onLdapLoginSyncFailed({
				error: e.message,
			});
			Logger.error('LDAP - Error during search', { message: e.message });
		}
		return undefined;
	}

	if (!searchResult.length) {
		return undefined;
	}

	// In the unlikely scenario that more than one user is found (
	// can happen depending on how the LDAP database is structured
	// and the LDAP configuration), return the last one found as it
	// should be the less important in the hierarchy.
	let user = searchResult.pop();

	if (user === undefined) {
		user = { dn: '' };
	}

	try {
		// Now with the user distinguished name (unique identifier
		// for the user) and the password, attempt to validate the
		// user by binding
		await ldapService.validUser(user.dn, password);
	} catch (e) {
		if (e instanceof Error) {
			Logger.error('LDAP - Error validating user against LDAP server', { message: e.message });
		}
		return undefined;
	}

	resolveEntryBinaryAttributes(user);

	return user;
};

/**
 * Retrieve auth identity by LDAP ID from database
 */
export const getAuthIdentityByLdapId = async (
	idAttributeValue: string,
): Promise<AuthIdentity | null> => {
	return Db.collections.AuthIdentity.findOne({
		relations: ['user', 'user.globalRole'],
		where: {
			providerId: idAttributeValue,
			providerType: 'ldap',
		},
	});
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
	return Db.collections.User.findOne({
		where: { email },
		relations: ['globalRole'],
	});
};

/**
 * Map attributes from the LDAP server to the proper columns in the database
 * e.g. mail => email | uid => ldapId
 */
export const mapLdapAttributesToUser = (
	ldapUser: LdapUser,
	ldapConfig: LdapConfig,
): [AuthIdentity['providerId'], Pick<User, 'email' | 'firstName' | 'lastName'>] => {
	return [
		ldapUser[ldapConfig.ldapIdAttribute] as string,
		{
			email: ldapUser[ldapConfig.emailAttribute] as string,
			firstName: ldapUser[ldapConfig.firstNameAttribute] as string,
			lastName: ldapUser[ldapConfig.lastNameAttribute] as string,
		},
	];
};

/**
 * Retrieve LDAP ID of all LDAP users in the database
 */
export const getLdapIds = async (): Promise<string[]> => {
	const identities = await Db.collections.AuthIdentity.find({
		select: ['providerId'],
		where: {
			providerType: 'ldap',
		},
	});
	return identities.map((i) => i.providerId);
};

export const getLdapUsers = async (): Promise<User[]> => {
	const identities = await Db.collections.AuthIdentity.find({
		relations: ['user'],
		where: {
			providerType: 'ldap',
		},
	});
	return identities.map((i) => i.user);
};

/**
 * Map a LDAP user to database user
 */
export const mapLdapUserToDbUser = (
	ldapUser: LdapUser,
	ldapConfig: LdapConfig,
	role?: Role,
): [string, User] => {
	const user = new User();
	const [ldapId, data] = mapLdapAttributesToUser(ldapUser, ldapConfig);
	Object.assign(user, data);
	if (role) {
		user.globalRole = role;
		user.password = randomPassword();
		user.disabled = false;
	} else {
		user.disabled = true;
	}
	return [ldapId, user];
};

/**
 * Save "toCreateUsers" in the database
 * Update "toUpdateUsers" in the database
 * Update "ToDisableUsers" in the database
 */
export const processUsers = async (
	toCreateUsers: Array<[string, User]>,
	toUpdateUsers: Array<[string, User]>,
	toDisableUsers: string[],
): Promise<void> => {
	await Db.transaction(async (transactionManager) => {
		return Promise.all([
			...toCreateUsers.map(async ([ldapId, user]) => {
				const authIdentity = AuthIdentity.create(await transactionManager.save(user), ldapId);
				return transactionManager.save(authIdentity);
			}),
			...toUpdateUsers.map(async ([ldapId, user]) => {
				const authIdentity = await transactionManager.findOneBy(AuthIdentity, {
					providerId: ldapId,
				});
				if (authIdentity?.userId) {
					await transactionManager.update(
						User,
						{ id: authIdentity.userId },
						{ email: user.email, firstName: user.firstName, lastName: user.lastName },
					);
				}
			}),
			...toDisableUsers.map(async (ldapId) => {
				const authIdentity = await transactionManager.findOneBy(AuthIdentity, {
					providerId: ldapId,
				});
				if (authIdentity?.userId) {
					await transactionManager.update(User, { id: authIdentity?.userId }, { disabled: true });
					await transactionManager.delete(AuthIdentity, { userId: authIdentity?.userId });
				}
			}),
		]);
	});
};

/**
 * Save a LDAP synchronization data to the database
 */
export const saveLdapSynchronization = async (
	data: Omit<AuthProviderSyncHistory, 'id' | 'providerType'>,
): Promise<void> => {
	await Db.collections.AuthProviderSyncHistory.save({
		...data,
		providerType: 'ldap',
	});
};

/**
 * Retrieve all LDAP synchronizations in the database
 */
export const getLdapSynchronizations = async (
	page: number,
	perPage: number,
): Promise<AuthProviderSyncHistory[]> => {
	const _page = Math.abs(page);
	return Db.collections.AuthProviderSyncHistory.find({
		where: { providerType: 'ldap' },
		order: { id: 'DESC' },
		take: perPage,
		skip: _page * perPage,
	});
};

/**
 * Format the LDAP connection URL to conform with LDAP client library
 */
export const formatUrl = (url: string, port: number, security: ConnectionSecurity) => {
	const protocol = ['tls'].includes(security) ? 'ldaps' : 'ldap';
	return `${protocol}://${url}:${port}`;
};

export const getMappingAttributes = (ldapConfig: LdapConfig): string[] => {
	return [
		ldapConfig.emailAttribute,
		ldapConfig.ldapIdAttribute,
		ldapConfig.firstNameAttribute,
		ldapConfig.lastNameAttribute,
		ldapConfig.emailAttribute,
	];
};

export const createLdapAuthIdentity = async (user: User, ldapId: string) => {
	return Db.collections.AuthIdentity.save(AuthIdentity.create(user, ldapId));
};

export const createLdapUserOnLocalDb = async (role: Role, data: Partial<User>, ldapId: string) => {
	const user = await Db.collections.User.save({
		password: randomPassword(),
		globalRole: role,
		...data,
	});
	await createLdapAuthIdentity(user, ldapId);
	return user;
};

export const updateLdapUserOnLocalDb = async (identity: AuthIdentity, data: Partial<User>) => {
	const userId = identity?.user?.id;
	if (userId) {
		await Db.collections.User.update({ id: userId }, data);
	}
};

const deleteAllLdapIdentities = async () => {
	return Db.collections.AuthIdentity.delete({ providerType: 'ldap' });
};
