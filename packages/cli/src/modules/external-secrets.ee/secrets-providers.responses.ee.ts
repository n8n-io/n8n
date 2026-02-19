import type { SecretProviderConnection } from '@n8n/api-types';

export declare namespace SecretsProvidersResponses {
	// Lightweight type for list responses (no settings, no secrets array)
	type ConnectionListItem = Omit<SecretProviderConnection, 'settings' | 'secrets'>;

	type Connection = SecretProviderConnection;

	/** @deprecated: use ConnectionListItem instead **/
	type StrippedConnection = ConnectionListItem;

	type PublicConnection = Promise<SecretProviderConnection>;
	type PublicConnectionList = Promise<ConnectionListItem[]>;
	type TestConnectionResult = Promise<{ success: boolean; error?: string }>;
}
