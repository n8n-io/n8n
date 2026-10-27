import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const ldapConfigurationFieldDocs = {
	loginEnabled: {
		description: 'Whether LDAP login is enabled.',
		example: false,
	},
	loginLabel: {
		description: 'Label shown on the LDAP login button.',
		example: 'LDAP',
	},
	connectionUrl: {
		description: 'LDAP server URL.',
		example: 'ldap://ldap.example.com',
	},
	allowUnauthorizedCerts: {
		description: 'Whether to allow unauthorized (self-signed) certificates.',
		example: false,
	},
	connectionSecurity: {
		description: 'TLS/SSL security mode for the LDAP connection.',
		example: 'none',
	},
	connectionPort: {
		description: 'LDAP server port.',
		example: 389,
	},
	baseDn: {
		description: 'Base DN for LDAP search queries.',
		example: 'dc=example,dc=com',
	},
	bindingAdminDn: {
		description: 'DN of the LDAP admin user for binding.',
		example: 'cn=admin,dc=example,dc=com',
	},
	bindingAdminPassword: {
		description:
			'Password for the LDAP admin user. Redacted on GET; returns the blanking placeholder when a password is stored, empty string when unset. Send the blanking placeholder from a prior GET to keep the stored password unchanged.',
	},
	firstNameAttribute: {
		description: "LDAP attribute mapped to the user's first name.",
		example: 'givenName',
	},
	lastNameAttribute: {
		description: "LDAP attribute mapped to the user's last name.",
		example: 'sn',
	},
	emailAttribute: {
		description: "LDAP attribute mapped to the user's email.",
		example: 'mail',
	},
	loginIdAttribute: {
		description: 'LDAP attribute used for login (usually the same as emailAttribute).',
		example: 'mail',
	},
	ldapIdAttribute: {
		description: 'LDAP attribute that uniquely identifies a user.',
		example: 'uid',
	},
	userFilter: {
		description:
			'Additional LDAP filter to apply when searching for users. Use an empty string for no additional filter.',
		example: '(objectClass=inetOrgPerson)',
	},
	synchronizationEnabled: {
		description: 'Whether automatic LDAP synchronization is enabled.',
		example: false,
	},
	synchronizationInterval: {
		description:
			'Interval in minutes between automatic synchronizations. Ignored if synchronizationEnabled is false.',
		example: 60,
	},
	searchPageSize: {
		description: 'Number of LDAP entries to fetch per search page.',
		example: 1000,
	},
	searchTimeout: {
		description: 'LDAP search timeout in seconds.',
		example: 60,
	},
	enforceEmailUniqueness: {
		description:
			'Whether to enforce that email addresses are unique across LDAP users. When true, if two users have the same email, only the first will be imported.',
		example: true,
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const ldapConfigurationUpdateFieldDocs = {
	loginEnabled: {
		description:
			'Whether LDAP login is enabled. Setting this to false is destructive — it deletes all stored LDAP user identities and disables synchronization.',
		example: false,
	},
	bindingAdminPassword: {
		description:
			'Password for the LDAP admin user. To keep an existing password unchanged, submit the blanking placeholder from a prior GET response. Use an empty string to clear the password.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
