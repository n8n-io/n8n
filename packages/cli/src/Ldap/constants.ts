/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/naming-convention */

export const LDAP_FEATURE_NAME = 'ldap';

export const LDAP_DISABLED = 'ldap.disabled';

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

export const LDAP_LOG_PREPEND_MESSAGE = 'LDAP -';
