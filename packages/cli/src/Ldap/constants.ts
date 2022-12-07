/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/naming-convention */

import { LdapConfig } from './types';

export const LDAP_FEATURE_NAME = 'ldap';

export const LDAP_ENABLED = 'enterprise.features.ldap';

export const LDAP_LOGIN_LABEL = 'ldap.loginLabel';

export const LDAP_LOGIN_ENABLED = 'ldap.loginEnabled';

export const BINARY_AD_ATTRIBUTES = ['objectGUID', 'objectSid'];

export enum ConnectionSecurity {
	NONE = 'none',
	TLS = 'tls',
	STARTTLS = 'startTls',
}

export enum RunningMode {
	DRY = 'dry',
	LIVE = 'live',
}

export enum SyncStatus {
	SUCCESS = 'success',
	ERROR = 'error',
}

export const LDAP_DEFAULT_CONFIGURATION = {
	loginEnabled: false,
	loginLabel: '',
	connectionUrl: '',
	allowUnauthorizedCerts: false,
	connectionSecurity: ConnectionSecurity.NONE,
	connectionPort: 389,
	baseDn: '',
	bindingAdminDn: '',
	bindingAdminPassword: '',
	firstNameAttribute: '',
	lastNameAttribute: '',
	emailAttribute: '',
	loginIdAttribute: '',
	ldapIdAttribute: '',
	userFilter: '',
	synchronizationEnabled: false,
	synchronizationInterval: 60,
	searchPageSize: 0,
	searchTimeout: 60,
};

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
