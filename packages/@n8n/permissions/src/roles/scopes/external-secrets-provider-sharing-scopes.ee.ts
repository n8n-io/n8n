import type { Scope } from '../../types.ee';

export const EXTERNAL_SECRETS_PROVIDER_SHARING_OWNER_SCOPES: Scope[] = [
	'externalSecretsProvider:read',
	'externalSecretsProvider:update',
	'externalSecretsProvider:delete',
	'externalSecretsProvider:sync',
];
