import type { SecretsProvider } from '@/Interfaces';
import { Service } from 'typedi';
import { InfisicalProvider } from './providers/infisical';
import { VaultProvider } from './providers/vault';
import { AwsSecretsManager } from './providers/aws-secrets/aws-secrets-manager';

@Service()
export class ExternalSecretsProviders {
	providers: Record<string, { new (): SecretsProvider }> = {
		awsSecretsManager: AwsSecretsManager,
		infisical: InfisicalProvider,
		vault: VaultProvider,
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
