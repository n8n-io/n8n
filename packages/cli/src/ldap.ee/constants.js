'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NON_SENSIBLE_LDAP_CONFIG_PROPERTIES =
	exports.LDAP_CONFIG_SCHEMA =
	exports.BINARY_AD_ATTRIBUTES =
	exports.LDAP_LOGIN_ENABLED =
	exports.LDAP_LOGIN_LABEL =
		void 0;
exports.LDAP_LOGIN_LABEL = 'sso.ldap.loginLabel';
exports.LDAP_LOGIN_ENABLED = 'sso.ldap.loginEnabled';
exports.BINARY_AD_ATTRIBUTES = ['objectGUID', 'objectSid'];
exports.LDAP_CONFIG_SCHEMA = {
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
exports.NON_SENSIBLE_LDAP_CONFIG_PROPERTIES = [
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
//# sourceMappingURL=constants.js.map
