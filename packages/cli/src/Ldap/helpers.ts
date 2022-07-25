/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable import/no-cycle */
import { AES, enc } from 'crypto-js';
import { Entry } from 'ldapts';
import { UserSettings } from 'n8n-core';
import { Db, IFeatureConfigDb } from '..';
import config from '../../config';
import { LdapSyncHistory } from '../databases/entities/LdapSyncHistory';
import { Role } from '../databases/entities/Role';
import { Settings } from '../databases/entities/Settings';
import { User } from '../databases/entities/User';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';
import { LdapManager } from './LdapManager';
import {
	LDAP_DISABLED,
	LDAP_FEATURE_NAME,
	LDAP_LOGIN_ENABLED,
	LDAP_LOGIN_LABEL,
	SignInType,
} from './constants';
import type { LdapConfig, LdapDbColumns } from './types';

/**
 * 	Check whether the LDAP feature
 *	is enabled in the instance
 */
export const isLdapDisabled = (): boolean => config.getEnv(LDAP_DISABLED);

/**
 *  Check whether the LDAP feature
 *	is disabled in the instance
 */
export const isLdapEnabled = (): boolean => !config.getEnv(LDAP_DISABLED);

/**
 * Set the LDAP login label
 * to the configuration object
 */
const setLdapLoginLabel = (value: string) => config.set(LDAP_LOGIN_LABEL, value);

/**
 * Set the LDAP login enabled
 * to the configuration object
 */
const setLdapLoginEnabled = (value: boolean) => config.set(LDAP_LOGIN_ENABLED, value);

/**
 * Retrieve the LDAP login label
 * from the configuration object
 */
export const getLdapLoginLabel = (): string => config.getEnv(LDAP_LOGIN_LABEL);

/**
 * Retrieve the LDAP login enabled
 * from the configuration object
 */
export const isLdapLoginEnabled = (): boolean => config.getEnv(LDAP_LOGIN_ENABLED);

/**
 * Check whether login with LDAP is
 * enabled in the instance
 */
export const isActiveDirectoryLoginDisabled = (): boolean => !config.getEnv(LDAP_LOGIN_ENABLED);

/**
 * Check whether the current run is the
 * first run after the feature was enabled
 * @param  {Settings[]} databaseSettings
 */
const isFirstRunAfterLdapFeatureEnabled = (databaseSettings: Settings[]) => {
	const dbSetting = databaseSettings.find((setting) => setting.key === LDAP_DISABLED);
	return !dbSetting;
};

/**
 * Return a random password
 * to be assigned to the LDAP users
 */
export const randomPassword = (): string => {
	return Math.random().toString(36).slice(-8);
};

/**
 * Return the user role to be assigned
 * to LDAP users
 */
export const getAdUserRole = async (): Promise<Role> => {
	return Db.collections.Role.findOneOrFail({ scope: 'global', name: 'member' });
};

/**
 * Encrypt password using the instance's
 * encryption key
 * @param  {string} password
 */
const encryptPassword = async (password: string) => {
	const encryptionKey = await UserSettings.getEncryptionKey();
	return AES.encrypt(password, encryptionKey).toString();
};

/**
 * Decrypt password using the instance's
 * encryption key
 * @param  {string} password
 */
const decryptPassword = async (password: string): Promise<string> => {
	const encryptionKey = await UserSettings.getEncryptionKey();
	return AES.decrypt(password, encryptionKey).toString(enc.Utf8);
};

/**
 * Save the LDAP settings
 * to the database
 */
const saveLdapSettings = async () => {
	const setting: Settings = {
		key: LDAP_DISABLED,
		value: 'false',
		loadOnStartup: true,
	};

	await Db.collections.Settings.save(setting);

	config.set(LDAP_DISABLED, false);
};

/**
 * Save the LDAP configuration
 * to the database with the default
 * values
 */
const saveLdapFeatureConfiguration = async () => {
	const featureConfig: IFeatureConfigDb = {
		name: LDAP_FEATURE_NAME,
		data: {
			login: {
				enabled: false,
				label: '',
			},
			connection: {
				url: '',
				useSsl: true,
			},
			binding: {
				baseDn: '',
				adminDn: '',
				adminPassword: '',
			},
			attributeMapping: {
				firstName: '',
				lastName: '',
				email: '',
				loginId: '',
				ldapId: '',
			},
			filter: {
				user: '',
			},
			syncronization: {
				enabled: false,
				interval: 60,
			},
		},
	};
	await Db.collections.FeatureConfig.save<IFeatureConfigDb>(featureConfig);
};

/**
 * Retrieve the LDAP configuration (decrypted)
 * form the database
 */
export const getLdapConfig = async (): Promise<{
	name: string;
	data: LdapConfig;
}> => {
	const configuration = await Db.collections.FeatureConfig.findOneOrFail({
		name: LDAP_FEATURE_NAME,
	});
	const configurationData = configuration.data as LdapConfig;
	configurationData.binding.adminPassword = await decryptPassword(
		configurationData.binding.adminPassword,
	);
	return {
		name: configuration.name,
		data: configurationData,
	};
};

/**
 * Take the LDAP configuration and
 * set login enabled and login label
 * to the config object
 * @param  {ActiveDirectoryConfig} config
 * @returns void
 */
const setGlobalLdapConfigVariables = (config: LdapConfig): void => {
	setLdapLoginEnabled(config.login.enabled);
	setLdapLoginLabel(config.login.label);
};
/**
 * Update the LDAP configuration
 * in the database
 * @param  {LdapConfig} config
 * @returns Promise<void>
 */
export const updateActiveDirectoryConfig = async (config: LdapConfig): Promise<void> => {
	config.binding.adminPassword = await encryptPassword(config.binding.adminPassword);

	if (!config.login.enabled) {
		config.syncronization.enabled = false;
	}

	await Db.collections.FeatureConfig.update({ name: LDAP_FEATURE_NAME }, { data: config });
	setGlobalLdapConfigVariables(config);
};
/**
 * Handle the LDAP initialization.
 * If it's the first run of this feature,
 * all the default data is created in the database
 * @param  {Settings[]} databaseSettings
 * @returns Promise
 */
export const handleLdapInit = async (databaseSettings: Settings[]): Promise<void> => {
	// Do nothing if UM is disabled, as UM
	// is required for LDAP to work
	if (!isUserManagementEnabled()) return;

	if (isFirstRunAfterLdapFeatureEnabled(databaseSettings)) {
		// Save in the setting that the feature was enabled.
		// Once the feature is enabled (not disabled explicily
		// when updating to the version that includes LDAP),
		// it cannot be disabled
		await saveLdapSettings();

		// Save all the default data for the feature
		await saveLdapFeatureConfiguration();
	}

	const adConfig = await getLdapConfig();

	setGlobalLdapConfigVariables(adConfig.data);

	// init LDAP manager with the current
	// configuration
	LdapManager.init(adConfig.data);
};

/**
 * Create and 'and' condition with the filter
 * and the configuration user filter
 * e.g. Given the input:
 * - filter: (mail=john@example.com)
 * - configUserFilter: (objectClass=person)

 * it will return (&(mail=john@example.com)(objectClass=person))
 * @param  {string} filter
 * @param  {string} configUserFilter
 * @returns string
 */
export const addConfigFilter = (filter: string, configUserFilter: string): string => {
	if (configUserFilter) {
		return `(&${configUserFilter}${filter})`;
	}
	return filter;
};
/**
 * Find and authenticate user in the LDAP
 * server.
 * @param  {string} email
 * @param  {string} password
 * @param  {string} loginIdAttribute
 * @param  {string} userFilter
 * @returns Promise
 */
export const findAndAuthenticateLdapUser = async (
	email: string,
	password: string,
	loginIdAttribute: string,
	userFilter: string,
): Promise<Entry | undefined> => {
	const ldapService = LdapManager.getInstance().service;

	// Search for the user with the administrator binding using the
	// the Login ID attribute and whatever was inputted in the UI's
	// email input.
	const searchResult = await ldapService.searchWithAdminBinding(
		addConfigFilter(`(${loginIdAttribute}=${email})`, userFilter),
	);

	if (!searchResult.length) {
		return undefined;
	}

	// In the unlikey scenario that more than one user is found (
	// can happen depending on how the LDAP database is structured
	// and the LADP configuration), return the last one found as it
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
	} catch (error) {
		return undefined;
	}

	return user;
};
/**
 * Retrieve user by LDAP ID
 * from database
 * @param  {string} idAttributeValue
 * @returns Promise
 */
export const getUserByLdapId = async (idAttributeValue: string): Promise<User | undefined> => {
	return Db.collections.User.findOne(
		{
			ldapId: idAttributeValue,
			signInType: SignInType.LDAP,
		},
		{
			relations: ['globalRole'],
		},
	);
};

/**
 * Map attributes from the LDAP server
 * to the proper columns in the database
 * e.g. mail => email | uid => ldapId
 * @param  {Entry} user
 * @param  {LdapConfig['attributeMapping']} attributes
 * @returns user
 */
export const mapLdapAttributesToDb = (
	user: Entry,
	attributes: LdapConfig['attributeMapping'],
): Partial<LdapDbColumns> => {
	return {
		email: user[attributes.email] as string,
		firstName: user[attributes.firstName] as string,
		lastName: user[attributes.lastName] as string,
		ldapId: user[attributes.ldapId] as string,
	};
};

/**
 * Retrieve ID of all LDAP users in the database
 * @returns Promise
 */
export const getLdapUsers = async (): Promise<string[]> => {
	const users = await Db.collections.User.find({
		where: { signInType: SignInType.LDAP },
		select: ['ldapId'],
	});
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return users.map((user) => user.ldapId) as string[];
};

/**
 * Map a LDAP user to database user
 * @param  {Entry} adUser
 * @param  {LdapConfig['attributeMapping']} attributes
 * @param  {Role} role?
 * @returns User
 */
export const mapLdapUserToDbUser = (
	adUser: Entry,
	attributes: LdapConfig['attributeMapping'],
	role?: Role,
): User => {
	return Object.assign(new User(), {
		...(role && { password: randomPassword() }),
		...(role && { signInType: SignInType.LDAP }),
		...(role && { globalRole: role }),
		...mapLdapAttributesToDb(adUser, attributes),
	});
};
/**
 * Save "toCreateUsers" in the database
 * Update "toUpdateUsers" in the database
 * Update "ToDisableUsers" in the database
 * @param  {User[]} toCreateUsers
 * @param  {User[]} toUpdateUsers
 * @param  {string[]} toDisableUsers
 * @returns string
 */
export const processUsers = async (
	toCreateUsers: User[],
	toUpdateUsers: User[],
	toDisableUsers: string[],
): Promise<void> => {
	await Db.transaction(async (transactionManager) => {
		return Promise.all([
			...toCreateUsers.map(async (user) => transactionManager.save<User>(user)),
			...toUpdateUsers.map(async (user) =>
				transactionManager.update<User>(
					'User',
					{ ldapId: user.ldapId as string },
					{ email: user.email, firstName: user.firstName, lastName: user.lastName },
				),
			),
			...toDisableUsers.map(async (ldapId) =>
				transactionManager.update<User>('User', { ldapId }, { disabled: true }),
			),
		]);
	});
};

/**
 * Save a LDAP syncronization data
 * to the database
 * @param  {LdapSyncHistory} sync
 * @returns Promise
 */
export const saveLdapSyncronization = async (sync: LdapSyncHistory): Promise<void> => {
	await Db.collections.LdapSyncHistory.save<LdapSyncHistory>(sync);
};

/**
 * Retrieve all LDAP syncronizations
 * in the database
 * @returns Promise
 */
export const getLdapSyncronizations = async (): Promise<LdapSyncHistory[]> => {
	return Db.collections.LdapSyncHistory.find({
		order: {
			id: 'DESC',
		},
	});
};
