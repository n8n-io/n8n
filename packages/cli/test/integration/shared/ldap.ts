import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/ldap.ee/constants';
import type { LdapConfig } from '@/ldap.ee/types';

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
