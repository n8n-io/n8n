import type { SecretProviderConnection } from '@n8n/api-types';

export declare namespace SecretsProvidersResponses {
	// Lightweight type for list responses (no settings)
	type ConnectionListItem = Omit<
		SecretProviderConnection,
		'settings' | 'secretsCount' | 'state' | 'isEnabled'
	>;

	// Full type for detail responses (includes redacted settings)
	type Connection = Omit<SecretProviderConnection, 'secretsCount' | 'state' | 'isEnabled'>;

	/** @deprecated: use ConnectionListItem instead **/
	type StrippedConnection = ConnectionListItem;

	type PublicConnection = Promise<Connection>;
	type PublicConnectionList = Promise<ConnectionListItem[]>;
	type TestConnectionResult = Promise<{ success: boolean; error?: string }>;
}
