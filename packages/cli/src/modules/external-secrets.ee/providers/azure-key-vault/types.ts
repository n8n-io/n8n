import type { SecretsProviderSettings } from '../../types';

export type AzureKeyVaultContext = SecretsProviderSettings<{
	vaultName: string;
	tenantId: string;
	clientId: string;
	clientSecret: string;
}>;
