export * from './api';
export * from './browser';
export * from './community-nodes';
export * from './instance';
export * from './execution';

export const LDAP_FEATURE_NAME = 'features.ldap';

export type ConnectionSecurity = 'none' | 'tls' | 'startTls';

export interface LdapConfig {
	loginEnabled: boolean;
	loginLabel: string;
	connectionUrl: string;
	allowUnauthorizedCerts: boolean;
	connectionSecurity: ConnectionSecurity;
	connectionPort: number;
	baseDn: string;
	bindingAdminDn: string;
	bindingAdminPassword: string;
	firstNameAttribute: string;
	lastNameAttribute: string;
	emailAttribute: string;
	loginIdAttribute: string;
	ldapIdAttribute: string;
	userFilter: string;
	synchronizationEnabled: boolean;
	synchronizationInterval: number; // minutes
	searchPageSize: number;
	searchTimeout: number;
}

export const LDAP_DEFAULT_CONFIGURATION: LdapConfig = {
	loginEnabled: false,
	loginLabel: '',
	connectionUrl: '',
	allowUnauthorizedCerts: false,
	connectionSecurity: 'none',
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

export { Time } from './time';

export const MIN_PASSWORD_CHAR_LENGTH = 8;

export const MAX_PASSWORD_CHAR_LENGTH = 64;
