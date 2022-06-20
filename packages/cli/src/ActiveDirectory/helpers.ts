/* eslint-disable import/no-cycle */
import { Entry } from 'ldapts';
import { Db, IActiveDirectoryFeatureConfig, IFeatureConfigDb } from '..';
import config from '../../config';
import { FeatureConfig } from '../databases/entities/FeatureConfig';
import { Settings } from '../databases/entities/Settings';
import { User } from '../databases/entities/User';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';
import { ActiveDirectoryManager } from './ActiveDirectoryManager';
import { ActiveDirectoryConfig } from './types';

const ACTIVE_DIRECTORY_DISABLED = 'activeDirectory.disabled';

const activeDirectoryDisabled = () => config.getEnv(ACTIVE_DIRECTORY_DISABLED);

const isFirstRunAfterFeatureEnabled = (databaseSettings: Settings[]) => {
	const dbSetting = databaseSettings.find((setting) => setting.key === ACTIVE_DIRECTORY_DISABLED);

	return !dbSetting;
};

const saveSetting = async () => {
	const setting: Settings = {
		key: ACTIVE_DIRECTORY_DISABLED,
		value: 'false',
		loadOnStartup: true,
	};

	await Db.collections.Settings.save(setting);

	config.set(ACTIVE_DIRECTORY_DISABLED, false);
};

const saveFeatureConfiguration = async () => {
	const featureConfig: FeatureConfig = {
		name: 'activeDirectory',
		data: JSON.stringify({
			activeDirectoryLoginEnabled: false,
			connection: {
				url: config.getEnv('activeDirectory.connection.url'),
			},
			binding: {
				baseDn: config.getEnv('activeDirectory.binding.baseDn'),
				adminDn: config.getEnv('activeDirectory.binding.adminDn'),
				adminPassword: config.getEnv('activeDirectory.binding.adminPassword'),
			},
			attributeMapping: {
				firstName: config.getEnv('activeDirectory.attributeMapping.firstName'),
				lastName: config.getEnv('activeDirectory.attributeMapping.lastName'),
				email: config.getEnv('activeDirectory.attributeMapping.email'),
				loginId: config.getEnv('activeDirectory.attributeMapping.loginId'),
			},
		}),
	};
	await Db.collections.FeatureConfig.save(featureConfig);
};

const getActiveDirectoryConfig = async (): Promise<IActiveDirectoryFeatureConfig> => {
	const configuration = await Db.collections.FeatureConfig.findOneOrFail({
		name: 'activeDirectory',
	});
	return {
		...configuration,
		data: JSON.parse(configuration.data) as ActiveDirectoryConfig,
	};
};

// rename to handle ad first init
export const handleActiveDirectoryFirstInit = async (
	databaseSettings: Settings[],
): Promise<void> => {
	if (!isUserManagementEnabled()) return;

	if (isFirstRunAfterFeatureEnabled(databaseSettings)) {
		await saveSetting();

		await saveFeatureConfiguration();
	}
};

const findUserOnActiveDirectory = async (
	email: string,
	password: string,
	loginIdAttribute: string,
): Promise<{ user?: Entry }> => {
	const activeDirectoryService = ActiveDirectoryManager.getInstance();

	const searchResult = await activeDirectoryService.searchWithAdminBinding(
		`(${loginIdAttribute}=${email})`,
	);

	if (!searchResult.length) {
		return {};
	}

	// get the last user in the results
	let user = searchResult.pop();

	if (user === undefined) {
		user = { dn: '' };
	}

	try {
		await activeDirectoryService.validUser(user.dn, password);
	} catch (error) {
		return {};
	}

	return {
		user,
	};
};

const getUserByUsername = async (usernameAttribute: string) => {
	return Db.collections.User.findOne(
		{ id: usernameAttribute },
		{
			relations: ['globalRole'],
		},
	);
};

const mapAttributesToLocalDb = (
	user: Entry,
	attributes: ActiveDirectoryConfig['attributeMapping'],
): Partial<User> => {
	return {
		email: user[attributes.email] as string,
		firstName: user[attributes.firstName] as string,
		lastName: user[attributes.lastName] as string,
		username: user[attributes.username] as string,
	};
};

export const handleActiveDirectoryLogin = async (
	email: string,
	password: string,
): Promise<{
	user?: User;
}> => {
	if (activeDirectoryDisabled()) return {};

	const adConfig = await getActiveDirectoryConfig();

	const {
		data: { attributeMapping },
	} = adConfig;

	ActiveDirectoryManager.getInstance().config = adConfig;

	const { user: adUser } = await findUserOnActiveDirectory(
		email,
		password,
		attributeMapping.loginId,
	);

	if (!adUser) {
		return {};
	}

	const localUser = await getUserByUsername(attributeMapping.username);

	if (!localUser) {
		await Db.collections.User.save({
			password: 'ramdonpassword',
			signInType: 'ldap',
			...mapAttributesToLocalDb(adUser, attributeMapping),
		});
	} else {
		await Db.collections.User.update(localUser.id, {
			...localUser,
			...mapAttributesToLocalDb(adUser, attributeMapping),
		});
	}

	// Retrieve the user again as user's data might have been updated
	const updatedUser = await getUserByUsername(attributeMapping.username);

	return {
		user: updatedUser,
	};
};
