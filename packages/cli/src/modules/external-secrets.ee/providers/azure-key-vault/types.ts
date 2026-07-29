import type { SecretsProviderSettings } from '../../types';

export type AzureKeyVaultEnvironment = 'public' | 'usGovernment' | 'china' | 'custom';

export type AzureKeyVaultContext = SecretsProviderSettings<{
	vaultName: string;
	tenantId: string;
	clientId: string;
	clientSecret: string;
	environment?: AzureKeyVaultEnvironment;
	vaultUrl?: string;
	authorityHost?: string;
}>;
