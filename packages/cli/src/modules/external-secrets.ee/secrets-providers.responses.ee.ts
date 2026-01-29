import type { SecretProviderConnection } from '@n8n/api-types';

export declare namespace SecretsProvidersResponses {
	type StrippedConnection = Omit<SecretProviderConnection, 'settings' | 'secretsCount' | 'state'>;

	type PublicConnection = Promise<StrippedConnection>;
	type PublicConnectionList = Promise<StrippedConnection[]>;
}
