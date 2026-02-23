import type { SecretProviderConnection } from '@n8n/api-types';

export declare namespace SecretsProvidersResponses {
	// Lightweight type for list responses (no settings, no secrets array)
	type ConnectionListItem = Omit<SecretProviderConnection, 'settings' | 'isEnabled' | 'secrets'>;

	// Full type for detail responses (includes redacted settings and secrets)
	type Connection = Omit<SecretProviderConnection, 'isEnabled'>;

	/** @deprecated: use ConnectionListItem instead **/
	type StrippedConnection = ConnectionListItem;

	type PublicConnection = Promise<Connection>;
	type PublicConnectionList = Promise<ConnectionListItem[]>;
	type TestConnectionResult = Promise<{ success: boolean; error?: string }>;
}
