export type CredentialSetupSupportedFieldType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'options'
	| 'multiOptions'
	| 'json'
	| 'notice';

export type CredentialSetupFieldOption = {
	name: string;
	value: string | number | boolean;
	description?: string;
};

export type CredentialSetupField = {
	name: string;
	displayName: string;
	type: CredentialSetupSupportedFieldType;
	required: boolean;
	password: boolean;
	default?: unknown;
	description?: string;
	options?: CredentialSetupFieldOption[];
};

export type CredentialSetupOutput = {
	setupSessionId?: string;
	credentialType: string;
	credentialDisplayName: string;
	credentialName: string;
	projectId?: string;
	nodeType?: string;
	purpose?: string;
	isOAuth: boolean;
	oauthVersion?: 'oauth1' | 'oauth2';
	fields: CredentialSetupField[];
	hasUnsupportedFields: boolean;
	unsupportedFieldNames: string[];
	fallbackUrl: string;
};

export type CredentialSetupSafeStatus =
	| 'setup_required'
	| 'created'
	| 'authorization_required'
	| 'pending'
	| 'connected'
	| 'tested'
	| 'deleted'
	| 'error';

export type CredentialSetupSafeResult = {
	credentialId?: string;
	credentialName?: string;
	credentialType: string;
	status: CredentialSetupSafeStatus;
	connected?: boolean;
	authorizationUrl?: string;
	fallbackUrl?: string;
	error?: string;
};
