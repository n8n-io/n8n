import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/Ldap/constants';
import type { LdapConfig } from '@/Ldap/types';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { jsonParse } from 'n8n-workflow';
import Container from 'typedi';

export const defaultLdapConfig = {
	...LDAP_DEFAULT_CONFIGURATION,
	loginEnabled: true,
	loginLabel: '',
	ldapIdAttribute: 'uid',
	firstNameAttribute: 'givenName',
	lastNameAttribute: 'sn',
	emailAttribute: 'mail',
	loginIdAttribute: 'mail',
	baseDn: 'baseDn',
	bindingAdminDn: 'adminDn',
	bindingAdminPassword: 'adminPassword',
};

export const createLdapConfig = async (
	attributes: Partial<LdapConfig> = {},
): Promise<LdapConfig> => {
	const { value: ldapConfig } = await Container.get(SettingsRepository).save({
		key: LDAP_FEATURE_NAME,
		value: JSON.stringify({
			...defaultLdapConfig,
			...attributes,
		}),
		loadOnStartup: true,
	});
	return await jsonParse(ldapConfig);
};
