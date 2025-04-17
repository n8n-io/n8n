import { Service } from '@n8n/di';

import type { SecretsProvider } from '@/interfaces';

import { AwsSecretsManager } from './providers/aws-secrets/aws-secrets-manager';
import { AzureKeyVault } from './providers/azure-key-vault/azure-key-vault';
import { GcpSecretsManager } from './providers/gcp-secrets-manager/gcp-secrets-manager';
import { InfisicalProvider } from './providers/infisical';
import { VaultProvider } from './providers/vault';

@Service()
export class ExternalSecretsProviders {
	providers: Record<string, { new (): SecretsProvider }> = {
		awsSecretsManager: AwsSecretsManager,
		infisical: InfisicalProvider,
		vault: VaultProvider,
		azureKeyVault: AzureKeyVault,
		gcpSecretsManager: GcpSecretsManager,
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
