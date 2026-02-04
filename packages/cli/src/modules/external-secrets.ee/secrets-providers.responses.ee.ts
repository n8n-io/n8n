import type { SecretProviderConnection } from '@n8n/api-types';

export declare namespace SecretsProvidersResponses {
	type StrippedConnection = Omit<
		SecretProviderConnection,
		'settings' | 'secretsCount' | 'state' | 'isEnabled'
	>;

	type PublicConnection = Promise<StrippedConnection>;
	type PublicConnectionList = Promise<StrippedConnection[]>;
	type TestConnectionResult = Promise<{ success: boolean; error?: string }>;
}
