/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/naming-convention */

export const LDAP_FEATURE_NAME = 'ldap';

export const LDAP_ENABLED = 'enterprise.features.ldap';

export const LDAP_LOGIN_LABEL = 'ldap.loginLabel';

export const LDAP_LOGIN_ENABLED = 'ldap.loginEnabled';

export enum SignInType {
	LDAP = 'ldap',
	EMAIL = 'email',
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
	login: {
		enabled: false,
		label: '',
	},
	connection: {
		url: '',
		useSsl: true,
		allowUnauthorizedCerts: false,
		startTLS: false,
	},
	binding: {
		baseDn: '',
		adminDn: '',
		adminPassword: '',
	},
	attributeMapping: {
		firstName: '',
		lastName: '',
		email: '',
		loginId: '',
		ldapId: '',
	},
	filter: {
		user: '',
	},
	syncronization: {
		enabled: false,
		interval: 60,
		pageSize: 0,
		searchTimeout: 60,
	},
};

export const LDAP_CONFIG_SCHEMA = {
	$schema: 'https://json-schema.org/draft/2019-09/schema',
	type: 'object',
	properties: {
		attributeMapping: {
			type: 'object',
			properties: {
				email: {
					type: 'string',
				},
				firstName: {
					type: 'string',
				},
				lastName: {
					type: 'string',
				},
				ldapId: {
					type: 'string',
				},
				loginId: {
					type: 'string',
				},
			},
			required: ['email', 'firstName', 'lastName', 'ldapId', 'loginId'],
			additionalProperties: false,
		},
		binding: {
			type: 'object',
			properties: {
				adminDn: {
					type: 'string',
				},
				adminPassword: {
					type: 'string',
				},
				baseDn: {
					type: 'string',
				},
			},
			required: ['adminDn', 'adminPassword', 'baseDn'],
			additionalProperties: false,
		},
		connection: {
			type: 'object',
			properties: {
				url: {
					type: 'string',
				},
				useSsl: {
					type: 'boolean',
				},
				allowUnauthorizedCerts: {
					type: 'boolean',
				},
				startTLS: {
					type: 'boolean',
				},
			},
			required: ['url', 'useSsl'],
			additionalProperties: false,
		},
		filter: {
			type: 'object',
			properties: {
				user: {
					type: 'string',
				},
			},
			required: ['user'],
			additionalProperties: false,
		},
		login: {
			type: 'object',
			properties: {
				enabled: {
					type: 'boolean',
				},
				label: {
					type: 'string',
				},
			},
			required: ['enabled', 'label'],
			additionalProperties: false,
		},
		syncronization: {
			type: 'object',
			properties: {
				enabled: {
					type: 'boolean',
				},
				interval: {
					type: 'number',
				},
				pageSize: {
					type: 'number',
				},
				searchTimeout: {
					type: 'number',
				},
			},
			required: ['enabled', 'interval', 'pageSize', 'searchTimeout'],
			additionalProperties: false,
		},
	},
	required: ['attributeMapping', 'binding', 'connection', 'filter', 'syncronization', 'login'],
	additionalProperties: false,
};
