import { Service } from '@n8n/di';

export interface IExternalSecretsManager {
	hasSecret(provider: string, name: string): boolean;
	getSecret(provider: string, name: string): unknown;
	getSecretNames(provider: string): string[];
	hasProvider(provider: string): boolean;
	getProviderNames(): string[];
}

@Service()
export class ExternalSecretsProxy {
	private manager?: IExternalSecretsManager;
	private projectProviderAccessMap: Record<string, Set<string>> = {};
	private globalProviderKeys: Set<string> = new Set();

	setManager(manager: IExternalSecretsManager) {
		this.manager = manager;
	}

	setAvailableProviderKeysForProject(projectId: string, providerKeys: string[]) {
		this.projectProviderAccessMap[projectId] = new Set(providerKeys);
	}

	setGloballyAvailableProviderKeys(providerKeys: string[]) {
		this.globalProviderKeys = new Set(providerKeys);
	}

	getSecret(provider: string, name: string) {
		return this.manager?.getSecret(provider, name);
	}

	hasSecret(provider: string, name: string): boolean {
		return !!this.manager && this.manager.hasSecret(provider, name);
	}

	hasProvider(provider: string, projectId?: string): boolean {
		if (
			this.globalProviderKeys.size === 0 &&
			Object.keys(this.projectProviderAccessMap).length === 0
		) {
			// Accessing a provider without previously calling setGloballyAvailableProviderKeys or setAvailableProviderKeysForProject
			// is not intended.
			return false;
		}

		if (
			this.globalProviderKeys.has(provider) ||
			(projectId && this.projectProviderAccessMap[projectId].has(provider))
		) {
			return !!this.manager && this.manager.hasProvider(provider);
		}
		return false;
	}

	listProviders(): string[] {
		return this.manager?.getProviderNames() ?? [];
	}

	listSecrets(provider: string): string[] {
		return this.manager?.getSecretNames(provider) ?? [];
	}
}
