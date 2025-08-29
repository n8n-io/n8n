import { Service } from '@n8n/di';

export interface IExternalSecretsManager {
	updateSecrets(): Promise<void>;
	hasSecret(provider: string, name: string): boolean;
	getSecret(provider: string, name: string): unknown;
	getSecretNames(provider: string): string[];
	hasProvider(provider: string): boolean;
	getProviderNames(): string[];
}

@Service()
export class ExternalSecretsProxy {
	private manager?: IExternalSecretsManager;

	setManager(manager: IExternalSecretsManager) {
		this.manager = manager;
	}

	async update() {
		await this.manager?.updateSecrets();
	}

	getSecret(provider: string, name: string) {
		return this.manager?.getSecret(provider, name);
	}

	hasSecret(provider: string, name: string): boolean {
		return !!this.manager && this.manager.hasSecret(provider, name);
	}

	hasProvider(provider: string): boolean {
		return !!this.manager && this.manager.hasProvider(provider);
	}

	listProviders(): string[] {
		return this.manager?.getProviderNames() ?? [];
	}

	listSecrets(provider: string): string[] {
		return this.manager?.getSecretNames(provider) ?? [];
	}
}
