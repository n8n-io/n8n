export const MAIN_AUTH_FIELD_NAME = 'authentication';
export const NODE_RESOURCE_FIELD_NAME = 'resource';

export const MFA_FORM = {
	MFA_TOKEN: 'MFA_TOKEN',
	MFA_RECOVERY_CODE: 'MFA_RECOVERY_CODE',
} as const;

export const MFA_AUTHENTICATION_REQUIRED_ERROR_CODE = 998;

export const MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED = 997;

export const MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH = 6;

export const MFA_AUTHENTICATION_RECOVERY_CODE_INPUT_MAX_LENGTH = 36;

export const enum SignInType {
	LDAP = 'ldap',
	EMAIL = 'email',
	OIDC = 'oidc',
}
