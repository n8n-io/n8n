import type { Scope } from '../../types.ee';

// Owner can edit connection settings AND use secrets
export const SECRETS_PROVIDER_CONNECTION_SHARING_OWNER_SCOPES: Scope[] = [
	'externalSecretsProvider:read',
	'externalSecretsProvider:update',
	'externalSecretsProvider:delete',
	'externalSecretsProvider:list',
	'externalSecretsProvider:sync',
	'externalSecret:list',
];

// User can only read connection info and use secrets
export const SECRETS_PROVIDER_CONNECTION_SHARING_USER_SCOPES: Scope[] = [
	'externalSecretsProvider:read',
	'externalSecretsProvider:list',
	'externalSecret:list',
];
