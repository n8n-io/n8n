// import config from '../../config';
// import { Db } from '../../src';
// import type { Settings } from '../../src/databases/entities/Settings';

// import {
// 	LDAP_DEFAULT_CONFIGURATION,
// 	LDAP_DISABLED,
// 	LDAP_FEATURE_NAME,
// 	LDAP_LOGIN_ENABLED,
// 	LDAP_LOGIN_LABEL,
// } from '../../src/Ldap/constants';
// import {
// 	decryptPassword,
// 	encryptPassword,
// 	getLdapConfig,
// 	getLdapLoginLabel,
// 	getLdapUserRole,
// 	isFirstRunAfterLdapFeatureEnabled,
// 	isLdapDisabled,
// 	isLdapEnabled,
// 	isLdapLoginEnabled,
// 	saveLdapConfig,
// 	saveLdapSettings,
// 	setLdapLoginEnabled,
// 	setLdapLoginLabel,
// 	validateLdapConfigurationSchema,
// 	setGlobalLdapConfigVariables,
// 	updateLdapConfig,
// } from '../../src/Ldap/helpers';
// import { LdapConfig } from '../../src/Ldap/types';
// import * as testDb from '../integration/shared/testDb';
// import * as utils from '../integration/shared/utils';

// let testDbName = '';

// describe('LDAP Helper', () => {
// 	beforeAll(async () => {
// 		const initResult = await testDb.init();
// 		testDbName = initResult.testDbName;
// 		utils.initConfigFile();
// 	});

// 	afterAll(async () => {
// 		await testDb.terminate(testDbName);
// 	});

// 	test('isLdapDisabled should return true when LDAP feature is disabled)', () => {
// 		config.set(LDAP_DISABLED, false);
// 		expect(isLdapDisabled()).toEqual(false);
// 	});

// 	test('isLdapDisabled should return false when LDAP feature is enabled)', () => {
// 		config.set(LDAP_DISABLED, true);
// 		expect(isLdapDisabled()).toEqual(true);
// 	});

// 	test('isLdapEnabled should return true when LDAP feature is enabled)', () => {
// 		config.set(LDAP_DISABLED, false);
// 		expect(isLdapEnabled()).toEqual(true);
// 	});

// 	test('isLdapEnabled should return false when LDAP feature is disabled)', () => {
// 		config.set(LDAP_DISABLED, true);
// 		expect(isLdapEnabled()).toEqual(false);
// 	});

// 	test('setLdapLoginLabel should set the login label in the config object)', () => {
// 		const label = 'test';
// 		setLdapLoginLabel(label);
// 		expect(label).toEqual(config.getEnv(LDAP_LOGIN_LABEL));
// 	});

// 	test('setLdapLoginEnabled should set login enabled in the config object)', () => {
// 		setLdapLoginEnabled(true);
// 		expect(config.getEnv(LDAP_LOGIN_ENABLED)).toEqual(true);
// 	});

// 	test('getLdapLoginLabel should return the login label from the config object)', () => {
// 		const label = 'test';
// 		config.set(LDAP_LOGIN_LABEL, label);
// 		expect(getLdapLoginLabel()).toEqual(label);
// 	});

// 	test('isLdapLoginEnabled should return true when the login with LDAP is enabled)', () => {
// 		config.set(LDAP_LOGIN_ENABLED, true);
// 		expect(isLdapLoginEnabled()).toEqual(true);
// 	});

// 	test('isLdapLoginEnabled should return false when the login with LDAP is disabled)', () => {
// 		config.set(LDAP_LOGIN_ENABLED, false);
// 		expect(isLdapLoginEnabled()).toEqual(false);
// 	});

// 	test('isFirstRunAfterLdapFeatureEnabled should return true when is the first run after the feature was activated)', () => {
// 		// setting should be missing the key ldap.disabled
// 		const settigns: Settings[] = [
// 			{
// 				key: 'userManagement.isInstanceOwnerSetUp',
// 				value: 'true',
// 				loadOnStartup: true,
// 			},
// 		];

// 		expect(isFirstRunAfterLdapFeatureEnabled(settigns)).toEqual(true);
// 	});

// 	test('isFirstRunAfterLdapFeatureEnabled should return false when it`s not the first run after the feature was activated)', () => {
// 		const settigns: Settings[] = [
// 			{
// 				key: 'userManagement.isInstanceOwnerSetUp',
// 				value: 'true',
// 				loadOnStartup: true,
// 			},
// 			{
// 				key: 'ldap.disabled',
// 				value: 'true',
// 				loadOnStartup: true,
// 			},
// 		];
// 		expect(isFirstRunAfterLdapFeatureEnabled(settigns)).toEqual(false);
// 	});

// 	test('getLdapUserRole should return a user role)', async () => {
// 		const role = await getLdapUserRole();
// 		expect(role.id).toBeDefined();
// 		expect(role.name).toBeDefined();
// 		expect(role.scope).toBeDefined();
// 	});

// 	test('validateLdapConfigurationSchema should return valid false when invalid config schema)', async () => {
// 		const invalidSchema = {
// 			connection: {
// 				data: 1,
// 			},
// 		};
// 		const { valid, message } = validateLdapConfigurationSchema(
// 			invalidSchema as unknown as LdapConfig,
// 		);
// 		expect(valid).toEqual(false);
// 		expect(message).toBeDefined();
// 	});

// 	test('validateLdapConfigurationSchema should return valid true when valid config schema)', async () => {
// 		const validSchema: LdapConfig = LDAP_DEFAULT_CONFIGURATION;
// 		const { valid, message } = validateLdapConfigurationSchema(validSchema);
// 		expect(valid).toEqual(true);
// 		expect(message).toEqual('');
// 	});

// 	test('encryptPassword should encrypt password using instance encryption key)', async () => {
// 		const encryptedPassword = await encryptPassword('test');
// 		expect(typeof encryptedPassword).toBe('string');
// 	});

// 	test('decryptPassword should decrypt password using instance encryption key)', async () => {
// 		const encryptedPassword = await decryptPassword('test');
// 		expect(typeof encryptedPassword).toBe('string');
// 	});

// 	test('saveLdapSettings should save LDAP settings)', async () => {
// 		await saveLdapSettings();
// 		const savedSetting = await Db.collections.Settings.findOne({ key: LDAP_DISABLED });
// 		expect(savedSetting?.key).toBe(LDAP_DISABLED);
// 		expect(savedSetting?.value).toBe('false');
// 		expect(savedSetting?.loadOnStartup).toBe(true);
// 	});

// 	test('saveLdapFeatureConfiguration should save the default LDAP configuration)', async () => {
// 		await saveLdapConfig();
// 		const featureConfig = await Db.collections.FeatureConfig.findOne({ name: LDAP_FEATURE_NAME });
// 		const data = featureConfig?.data as LdapConfig;
// 		expect(featureConfig?.name).toBe(LDAP_FEATURE_NAME);
// 		expect(data).toMatchObject(LDAP_DEFAULT_CONFIGURATION);
// 	});

// 	test('getLdapConfig should return the current LDAP configuration)', async () => {
// 		await saveLdapConfig();
// 		const { name, data } = await getLdapConfig();
// 		expect(name).toBe(LDAP_FEATURE_NAME);
// 		expect(data).toMatchObject(LDAP_DEFAULT_CONFIGURATION);
// 	});

// 	test('setGlobalLdapConfigVariables should set login enabled and loding label in the config object)', async () => {
// 		setGlobalLdapConfigVariables(LDAP_DEFAULT_CONFIGURATION);
// 		expect(config.getEnv(LDAP_LOGIN_ENABLED)).toEqual(false);
// 		expect(config.getEnv(LDAP_LOGIN_LABEL)).toEqual('');
// 	});

// 	test('updateLdapConfig should update LDAP configuration)', async () => {
// 		const url = 'https://test.com';
// 		const useSsl = true;

// 		await saveLdapConfig();
// 		const currentConfiguration = await getLdapConfig();

// 		const updatedDefaultConfiguration = {
// 			...currentConfiguration.data,
// 			...{
// 				connection: {
// 					url,
// 					useSsl,
// 				},
// 			},
// 		}

// 		await updateLdapConfig(updatedDefaultConfiguration);

// 		const configurationAfterUpdate = await getLdapConfig();

// 		expect(configurationAfterUpdate.data.connection.url).toEqual(url);
// 		expect(configurationAfterUpdate.data.connection.useSsl).toEqual(true);
// 	});
// });
