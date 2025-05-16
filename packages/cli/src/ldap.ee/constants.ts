import type { LdapConfig } from '@n8n/constants';

export const LDAP_LOGIN_LABEL = 'sso.ldap.loginLabel';

export const LDAP_LOGIN_ENABLED = 'sso.ldap.loginEnabled';

export const BINARY_AD_ATTRIBUTES = ['objectGUID', 'objectSid'];

export const LDAP_CONFIG_SCHEMA = {
	$schema: 'https://json-schema.org/draft/2019-09/schema',
	type: 'object',
	properties: {
		emailAttribute: {
			type: 'string',
		},
		firstNameAttribute: {
			type: 'string',
		},
		lastNameAttribute: {
			type: 'string',
		},
		ldapIdAttribute: {
			type: 'string',
		},
		loginIdAttribute: {
			type: 'string',
		},
		bindingAdminDn: {
			type: 'string',
		},
		bindingAdminPassword: {
			type: 'string',
		},
		baseDn: {
			type: 'string',
		},
		connectionUrl: {
			type: 'string',
		},
		connectionSecurity: {
			type: 'string',
		},
		connectionPort: {
			type: 'number',
		},
		allowUnauthorizedCerts: {
			type: 'boolean',
		},
		userFilter: {
			type: 'string',
		},
		loginEnabled: {
			type: 'boolean',
		},
		loginLabel: {
			type: 'string',
		},
		synchronizationEnabled: {
			type: 'boolean',
		},
		synchronizationInterval: {
			type: 'number',
		},
		searchPageSize: {
			type: 'number',
		},
		searchTimeout: {
			type: 'number',
		},
	},
	required: [
		'loginEnabled',
		'loginLabel',
		'connectionUrl',
		'allowUnauthorizedCerts',
		'connectionSecurity',
		'connectionPort',
		'baseDn',
		'bindingAdminDn',
		'bindingAdminPassword',
		'firstNameAttribute',
		'lastNameAttribute',
		'emailAttribute',
		'loginIdAttribute',
		'ldapIdAttribute',
		'userFilter',
		'synchronizationEnabled',
		'synchronizationInterval',
		'searchPageSize',
		'searchTimeout',
	],
	additionalProperties: false,
};

export const NON_SENSIBLE_LDAP_CONFIG_PROPERTIES: Array<keyof LdapConfig> = [
	'loginEnabled',
	'emailAttribute',
	'firstNameAttribute',
	'lastNameAttribute',
	'loginIdAttribute',
	'ldapIdAttribute',
	'synchronizationEnabled',
	'synchronizationInterval',
	'searchPageSize',
	'searchTimeout',
	'loginLabel',
];
