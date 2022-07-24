/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable import/no-cycle */
import { AES, enc } from 'crypto-js';
import { Entry } from 'ldapts';
import { UserSettings } from 'n8n-core';
import { Db, IFeatureConfigDb } from '..';
import config from '../../config';
import { ActiveDirectorySync } from '../databases/entities/ActiveDirectorySync';
import { Role } from '../databases/entities/Role';
import { Settings } from '../databases/entities/Settings';
import { User } from '../databases/entities/User';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';
import { ActiveDirectoryManager } from './ActiveDirectoryManager';
import {
	ACTIVE_DIRECTORY_DISABLED,
	ACTIVE_DIRECTORY_FEATURE_NAME,
	ACTIVE_DIRECTORY_LOGIN_ENABLED,
	ACTIVE_DIRECTORY_LOGIN_LABEL,
	SignInType,
} from './constants';
import type { ActiveDirectoryConfig } from './types';

export const isActiveDirectoryDisabled = (): boolean => config.getEnv(ACTIVE_DIRECTORY_DISABLED);

export const isActiveDirectoryEnabled = (): boolean => !config.getEnv(ACTIVE_DIRECTORY_DISABLED);

const setAdLoginLabel = (value: string) => config.set(ACTIVE_DIRECTORY_LOGIN_LABEL, value);

const setAdLoginEnabled = (value: boolean) => config.set(ACTIVE_DIRECTORY_LOGIN_ENABLED, value);

export const getActiveDirectoryLoginLabel = (): string =>
	config.getEnv(ACTIVE_DIRECTORY_LOGIN_LABEL);

export const isActiveDirectoryLoginEnabled = (): boolean =>
	config.getEnv(ACTIVE_DIRECTORY_LOGIN_ENABLED);

export const isActiveDirectoryLoginDisabled = (): boolean =>
	!config.getEnv(ACTIVE_DIRECTORY_LOGIN_ENABLED);

const isFirstRunAfterFeatureEnabled = (databaseSettings: Settings[]) => {
	const dbSetting = databaseSettings.find((setting) => setting.key === ACTIVE_DIRECTORY_DISABLED);

	return !dbSetting;
};

export const randonPassword = (): string => {
	return Math.random().toString(36).slice(-8);
};

export const getAdUserRole = async (): Promise<Role> => {
	return Db.collections.Role.findOneOrFail({ scope: 'global', name: 'member' });
};

const encryptPassword = async (password: string) => {
	const encryptionKey = await UserSettings.getEncryptionKey();
	return AES.encrypt(password, encryptionKey).toString();
};

const saveSettings = async () => {
	const setting: Settings = {
		key: ACTIVE_DIRECTORY_DISABLED,
		value: 'false',
		loadOnStartup: true,
	};

	await Db.collections.Settings.save(setting);

	config.set(ACTIVE_DIRECTORY_DISABLED, false);
};

const saveFeatureConfiguration = async () => {
	const featureConfig: IFeatureConfigDb = {
		name: ACTIVE_DIRECTORY_FEATURE_NAME,
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

const decryptPassword = async (password: string): Promise<string> => {
	const encryptionKey = await UserSettings.getEncryptionKey();
	return AES.decrypt(password, encryptionKey).toString(enc.Utf8);
};

export const getActiveDirectoryConfig = async (): Promise<{
	name: string;
	data: ActiveDirectoryConfig;
}> => {
	const configuration = await Db.collections.FeatureConfig.findOneOrFail({
		name: ACTIVE_DIRECTORY_FEATURE_NAME,
	});
	const configurationData = configuration.data as ActiveDirectoryConfig;
	configurationData.binding.adminPassword = await decryptPassword(
		configurationData.binding.adminPassword,
	);
	return {
		name: configuration.name,
		data: configurationData,
	};
};

const setGlobalADConfigVariables = (config: ActiveDirectoryConfig): void => {
	setAdLoginEnabled(config.login.enabled);
	setAdLoginLabel(config.login.label);
};

export const updateActiveDirectoryConfig = async (config: ActiveDirectoryConfig): Promise<void> => {
	config.binding.adminPassword = await encryptPassword(config.binding.adminPassword);

	if (!config.login.enabled) {
		config.syncronization.enabled = false;
	}

	await Db.collections.FeatureConfig.update(
		{ name: ACTIVE_DIRECTORY_FEATURE_NAME },
		{ data: config },
	);
	setGlobalADConfigVariables(config);
};

// rename to handle ad first init
export const handleActiveDirectoryFirstInit = async (
	databaseSettings: Settings[],
): Promise<void> => {
	if (!isUserManagementEnabled()) return;

	if (isFirstRunAfterFeatureEnabled(databaseSettings)) {
		await saveSettings();

		await saveFeatureConfiguration();
	}

	const adConfig = await getActiveDirectoryConfig();

	setGlobalADConfigVariables(adConfig.data);

	ActiveDirectoryManager.init(adConfig.data);
};

export const addConfigFilter = (filter: string, configUserFilter: string): string => {
	if (configUserFilter) {
		return `(&${configUserFilter}${filter})`;
	}
	return filter;
};

export const findUserOnActiveDirectory = async (
	email: string,
	password: string,
	loginIdAttribute: string,
	userFilter: string,
): Promise<Entry | undefined> => {
	const activeDirectoryService = ActiveDirectoryManager.getInstance().service;

	const searchResult = await activeDirectoryService.searchWithAdminBinding(
		addConfigFilter(`(${loginIdAttribute}=${email})`, userFilter),
	);

	if (!searchResult.length) {
		return undefined;
	}

	// get the last user in the results
	let user = searchResult.pop();

	if (user === undefined) {
		user = { dn: '' };
	}

	try {
		await activeDirectoryService.validUser(user.dn, password);
	} catch (error) {
		return undefined;
	}

	return user;
};

export const getUserByUsername = async (
	usernameAttributeValue: string,
): Promise<User | undefined> => {
	return Db.collections.User.findOne(
		{
			username: usernameAttributeValue,
			signInType: SignInType.LDAP,
		},
		{
			relations: ['globalRole'],
		},
	);
};

export const mapAttributesToLocalDb = (
	user: Entry,
	attributes: ActiveDirectoryConfig['attributeMapping'],
): Partial<{ email: string; firstName: string; lastName: string; username: string }> => {
	return {
		email: user[attributes.email] as string,
		firstName: user[attributes.firstName] as string,
		lastName: user[attributes.lastName] as string,
		username: user[attributes.ldapId] as string,
	};
};

// export const handleActiveDirectoryLogin = async (
// 	email: string,
// 	password: string,
// ): Promise<User | undefined> => {
// 	if (isActiveDirectoryDisabled()) return undefined;

// 	const adConfig = await getActiveDirectoryConfig();

// 	if (!adConfig.data.login.enabled) return undefined;

// 	const {
// 		data: { attributeMapping },
// 	} = adConfig;

// 	const adUser = await findUserOnActiveDirectory(email, password, attributeMapping.loginId);

// 	if (!adUser) return undefined;

// 	const usernameAttributeValue = adUser[attributeMapping.username] as string | undefined;

// 	if (!usernameAttributeValue) return undefined;

// 	const localUser = await getUserByUsername(usernameAttributeValue);

// 	if (localUser?.disabled) return undefined;

// 	if (!localUser) {
// 		const role = await getAdUserRole();

// 		await Db.collections.User.save({
// 			password: randonPassword(),
// 			signInType: SignInType.LDAP,
// 			globalRole: role,
// 			...mapAttributesToLocalDb(adUser, attributeMapping),
// 		});
// 	} else {
// 		// @ts-ignore
// 		delete localUser.isPending;
// 		// move this to it's own function
// 		await Db.collections.User.update(localUser.id, {
// 			...localUser,
// 			...mapAttributesToLocalDb(adUser, attributeMapping),
// 		});
// 	}

// 	// Retrieve the user again as user's data might have been updated
// 	const updatedUser = await getUserByUsername(usernameAttributeValue);

// 	return updatedUser;
// };

export const getActiveDirectoryUsersInLocalDb = async (): Promise<string[]> => {
	const users = await Db.collections.User.find({
		where: { signInType: SignInType.LDAP },
		select: ['username'],
	});
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return users.map((user) => user.username) as string[];
};

export const mapToLocalDbUser = (
	adUser: Entry,
	attributes: ActiveDirectoryConfig['attributeMapping'],
	role?: Role,
): User => {
	return Object.assign(new User(), {
		...(role && { password: randonPassword() }),
		...(role && { signInType: SignInType.LDAP }),
		...(role && { globalRole: role }),
		...mapAttributesToLocalDb(adUser, attributes),
	});
};

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
					{ username: user.username as string },
					{ email: user.email, firstName: user.firstName, lastName: user.lastName },
				),
			),
			...toDisableUsers.map(async (username) =>
				transactionManager.update<User>('User', { username }, { disabled: true }),
			),
		]);
	});
};

export const saveSyncronization = async (sync: ActiveDirectorySync): Promise<void> => {
	await Db.collections.ActiveDirectorySync.save<ActiveDirectorySync>(sync);
};

export const listADSyncronizations = async (): Promise<ActiveDirectorySync[]> => {
	return Db.collections.ActiveDirectorySync.find({
		order: {
			id: 'DESC',
		},
	});

	// const responseMapper = (sync: ActiveDirectorySync): SyncronizationList => {
	// 	const runTimeInMinutes = sync.endedAt.getTime() - sync.startedAt.getTime();
	// 	return {
	// 		id: sync.id,
	// 		runTime: humanizeDuration(runTimeInMinutes),
	// 		scanned: sync.scanned,
	// 		status: sync.status,
	// 		startedAt: sync.startedAt.toUTCString(),
	// 		errorMessage: sync.error,
	// 	};
	// };

	// return data.map(responseMapper);
};
