import type { SecretsProviderSettings } from '../../types.js';

export type AzureKeyVaultContext = SecretsProviderSettings<{
	vaultName: string;
	tenantId: string;
	clientId: string;
	clientSecret: string;
}>;
