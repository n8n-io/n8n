import type { SecretsProviderSettings } from '@/Interfaces';

export type AzureKeyVaultContext = SecretsProviderSettings<{
	vaultName: string;
	tenantId: string;
	clientId: string;
	clientSecret: string;
}>;

export type AzureKeyVaultSecret = {
	name: string;
	value: string;
};
