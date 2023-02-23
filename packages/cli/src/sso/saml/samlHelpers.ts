import config from '@/config';
import { getLicense } from '../../License';
import { isUserManagementEnabled } from '../../UserManagement/UserManagementHelper';
import type { SamlPreferences } from './types/samlPreferences';

/**
 *  Check whether the SAML feature is licensed and enabled in the instance
 */
export function isSamlEnabled(): boolean {
	return config.getEnv('sso.saml.enabled');
}

export function isSamlLicensed(): boolean {
	const license = getLicense();
	return isUserManagementEnabled() && license.isSamlEnabled();
}

export const isSamlPreferences = (candidate: unknown): candidate is SamlPreferences => {
	const o = candidate as SamlPreferences;
	return typeof o === 'object' && typeof o.metadata === 'string' && typeof o.mapping === 'object';
};

export function generatePassword(): string {
	const length = 18;
	const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	const charsetNoNumbers = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const randomNumber = Math.floor(Math.random());
	const randomUpper = charset.charAt(Math.floor(Math.random() * charsetNoNumbers.length));
	const randomNumberPosition = Math.floor(Math.random() * length);
	const randomUpperPosition = Math.floor(Math.random() * length);
	let password = '';
	for (let i = 0, n = charset.length; i < length; ++i) {
		password += charset.charAt(Math.floor(Math.random() * n));
	}
	password =
		password.substring(0, randomNumberPosition) +
		randomNumber.toString() +
		password.substring(randomNumberPosition);
	password =
		password.substring(0, randomUpperPosition) +
		randomUpper +
		password.substring(randomUpperPosition);
	return password;
}
