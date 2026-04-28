import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';

import { ExternalSecretsManager } from './external-secrets-manager.ee';
import { RedactionService } from './redaction.service.ee';
import type { ExternalSecretsRequest, SecretsProvider } from './types';

@Service()
export class ExternalSecretsService {
	constructor(
		private readonly externalSecretsManager: ExternalSecretsManager,
		private readonly redactionService: RedactionService,
	) {}

	getProvider(providerName: string): ExternalSecretsRequest.GetProviderResponse | null {
		const providerAndSettings = this.externalSecretsManager.getProviderWithSettings(providerName);
		const { provider, settings } = providerAndSettings;
		return {
			displayName: provider.displayName,
			name: provider.name,
			icon: provider.name,
			state: provider.state,
			connected: settings.connected,
			connectedAt: settings.connectedAt,
			properties: provider.properties,
			data: this.redact(settings.settings, provider),
		};
	}

	getProviders() {
		return this.externalSecretsManager.getProvidersWithSettings().map(({ provider, settings }) => ({
			displayName: provider.displayName,
			name: provider.name,
			icon: provider.name,
			state: provider.state,
			connected: !!settings.connected,
			connectedAt: settings.connectedAt,
			data: this.redact(settings.settings, provider),
		}));
	}

	// Take data and replace all sensitive values with a sentinel value.
	// This will replace password fields and oauth data.
	redact(data: IDataObject, provider: SecretsProvider): IDataObject {
		return this.redactionService.redact(data, provider.properties);
	}

	// Take unredacted data (probably from the DB) and merge it with
	// redacted data to create an unredacted version.
	unredact(redactedData: IDataObject, savedData: IDataObject): IDataObject {
		return this.redactionService.unredact(redactedData, savedData);
	}

	async saveProviderSettings(providerName: string, data: IDataObject, userId: string) {
		const providerAndSettings = this.externalSecretsManager.getProviderWithSettings(providerName);
		const { settings } = providerAndSettings;
		const newData = this.unredact(data, settings.settings);
		await this.externalSecretsManager.setProviderSettings(providerName, newData, userId);
	}

	async saveProviderConnected(providerName: string, connected: boolean) {
		await this.externalSecretsManager.setProviderConnected(providerName, connected);
		return this.getProvider(providerName);
	}

	getAllSecrets(): Record<string, string[]> {
		return this.externalSecretsManager.getAllSecretNames();
	}

	async testProviderSettings(providerName: string, data: IDataObject) {
		const providerAndSettings = this.externalSecretsManager.getProviderWithSettings(providerName);
		const { settings } = providerAndSettings;
		const newData = this.unredact(data, settings.settings);
		return await this.externalSecretsManager.testProviderSettings(providerName, newData);
	}

	async updateProvider(providerName: string) {
		return await this.externalSecretsManager.updateProvider(providerName);
	}
}
