import type { SecretsProvider } from '@/Interfaces';
import { Service } from 'typedi';
import { InfisicalProvider } from './providers/infisical';
import { VaultProvider } from './providers/vault';
import { AwsSecretsManager } from './providers/aws-secrets/aws-secrets-manager';
import { AzureKeyVault } from './providers/azure-key-vault/azure-key-vault';

@Service()
export class ExternalSecretsProviders {
	providers: Record<string, { new (): SecretsProvider }> = {
		awsSecretsManager: AwsSecretsManager,
		infisical: InfisicalProvider,
		vault: VaultProvider,
		azureKeyVault: AzureKeyVault,
	};

	getProvider(name: string): { new (): SecretsProvider } | null {
		return this.providers[name] ?? null;
	}

	hasProvider(name: string) {
		return name in this.providers;
	}

	getAllProviders() {
		return this.providers;
	}
}
