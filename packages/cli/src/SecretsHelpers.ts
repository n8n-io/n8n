import type { IDataObject, SecretsHelpersBase } from 'n8n-workflow';
import { Service } from 'typedi';
import { ExternalSecretsManager } from './ExternalSecrets/ExternalSecretsManager.ee';

@Service()
export class SecretsHelper implements SecretsHelpersBase {
	constructor(private service: ExternalSecretsManager) {}

	async update() {
		if (!this.service.initialized) {
			await this.service.init();
		}
		await this.service.updateSecrets();
	}

	async waitForInit() {
		if (!this.service.initialized) {
			await this.service.init();
		}
	}

	getSecret(provider: string, name: string): IDataObject | undefined {
		return this.service.getSecret(provider, name);
	}

	hasSecret(provider: string, name: string): boolean {
		return this.service.hasSecret(provider, name);
	}

	hasProvider(provider: string): boolean {
		return this.service.hasProvider(provider);
	}

	listProviders(): string[] {
		return this.service.getProviderNames() ?? [];
	}

	listSecrets(provider: string): string[] {
		return this.service.getSecretNames(provider) ?? [];
	}
}
