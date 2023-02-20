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
