// import Container from 'typedi';
// import { License } from '@/License';
import { isUserManagementEnabled } from '@/UserManagement/UserManagementHelper';
import config from '@/config';
import type { OpenIDConfig } from './types';
import { jsonParse } from 'n8n-workflow';
import * as Db from '@/Db';
import {
	OPENID_BUTTON_NAME,
	OPENID_CONFIG_SCHEMA,
	OPENID_FEATURE_NAME,
	OPENID_LOGIN_ENABLED,
	OPENID_SERVICE_PROVIDER,
} from './constants';
import { validate } from 'jsonschema';
import { UserSettings } from 'n8n-core';
import { AES, enc } from 'crypto-js';

export const isOpenIDEnabled = (): boolean => {
	// const license = Container.get(License);
	return isUserManagementEnabled();

	// (config.getEnv(OPENID_FEATURE_ENABLED) || license.isOpenIdEnabled())
	// config.getEnv(OPENID_FEATURE_ENABLED)
};

export const isOpenIDLoginEnabled = (): boolean => config.getEnv(OPENID_LOGIN_ENABLED);

export const getOpenIDServiceProvider = (): string => config.getEnv(OPENID_SERVICE_PROVIDER);

export const getOpenIDButtonName = (): string => config.getEnv(OPENID_BUTTON_NAME);

/**
 * Retrieve the OpenID configuration (decrypted) form the database
 */
export const getOpenIdConfig = async (): Promise<OpenIDConfig> => {
	const configuration = await Db.collections.Settings.findOneByOrFail({
		key: OPENID_FEATURE_NAME,
	});
	const configurationData = jsonParse<OpenIDConfig>(configuration.value);

	return configurationData;
};

export const setOpenIDLoginEnabled = (value: boolean): void => {
	config.set(OPENID_LOGIN_ENABLED, value);
};

export const setOpenIDServiceProvider = (value: string): void => {
	config.set(OPENID_SERVICE_PROVIDER, value);
};

export const setOpenIDButtonName = (value: string): void => {
	config.set(OPENID_BUTTON_NAME, value);
};

export const setGlobalOpenIDConfigVariables = (openidConfig: OpenIDConfig): void => {
	setOpenIDLoginEnabled(openidConfig.loginEnabled);
	setOpenIDServiceProvider(openidConfig.serviceProvider);
	setOpenIDButtonName(openidConfig.buttonName);
};

/**
 * Encrypt password using the instance's encryption key
 */
export const encryptClientSecret = async (clientSecret: string): Promise<string> => {
	const encryptionKey = await UserSettings.getEncryptionKey();
	return AES.encrypt(clientSecret, encryptionKey).toString();
};

/**
 * Decrypt password using the instance's encryption key
 */
export const decryptClientSecret = async (clientSecret: string): Promise<string> => {
	const encryptionKey = await UserSettings.getEncryptionKey();
	return AES.decrypt(clientSecret, encryptionKey).toString(enc.Utf8);
};

/**
 * Handle the OpenID initialization.
 * If it's the first run of this feature, all the default data is created in the database
 */
export const handleOpenIDInit = async (): Promise<void> => {
	if (!isOpenIDEnabled) return;

	const openIDConfig = await getOpenIdConfig();

	setGlobalOpenIDConfigVariables(openIDConfig);
};

export const validateOpenIDConfigurationSchema = (
	openidConfig: OpenIDConfig,
): { valid: boolean; message: string } => {
	const { valid, errors } = validate(openidConfig, OPENID_CONFIG_SCHEMA, { nestedErrors: true });

	let message = '';
	if (!valid) {
		message = errors.map((error) => `request.body.${error.path[0]} ${error.message}`).join(',');
	}
	return { valid, message };
};

export const updateOpenIDConfig = async (openIDConfig: OpenIDConfig): Promise<void> => {
	const { valid, message } = validateOpenIDConfigurationSchema(openIDConfig);

	if (!valid) {
		throw new Error(message);
	}

	openIDConfig.clientSecret = await encryptClientSecret(openIDConfig.clientSecret);

	await Db.collections.Settings.update(
		{ key: OPENID_FEATURE_NAME },
		{ value: JSON.stringify(openIDConfig), loadOnStartup: false },
	);

	setGlobalOpenIDConfigVariables(openIDConfig);
};
