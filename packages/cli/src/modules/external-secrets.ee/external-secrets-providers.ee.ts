import { Service } from '@n8n/di';

import { AwsSecretsManager } from './providers/aws-secrets-manager';
import { AzureKeyVault } from './providers/azure-key-vault/azure-key-vault';
import { GcpSecretsManager } from './providers/gcp-secrets-manager/gcp-secrets-manager';
import { InfisicalProvider } from './providers/infisical';
import { VaultProvider } from './providers/vault';
import type { SecretsProvider } from './types';

@Service()
export class ExternalSecretsProviders {
	providers: Record<string, { new (): SecretsProvider }> = {
		awsSecretsManager: AwsSecretsManager,
		infisical: InfisicalProvider,
		vault: VaultProvider,
		azureKeyVault: AzureKeyVault,
		gcpSecretsManager: GcpSecretsManager,
	};

	getProvider(name: string): { new (): SecretsProvider } {
		return this.providers[name];
	}

	hasProvider(name: string) {
		return name in this.providers;
	}

	getAllProviders() {
		return this.providers;
	}
}
