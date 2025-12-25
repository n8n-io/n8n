import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';

import { ExternalSecretsManager } from './external-secrets-manager.ee';
import type { ExternalSecretsRequest, SecretsProvider } from './types';

@Service()
export class ExternalSecretsService {
	constructor(private readonly externalSecretsManager: ExternalSecretsManager) {}

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
		const copiedData = deepCopy(data || {});

		const properties = provider.properties;

		for (const dataKey of Object.keys(copiedData)) {
			// The frontend only cares that this value isn't falsy.
			if (dataKey === 'oauthTokenData') {
				copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				continue;
			}
			const prop = properties.find((v) => v.name === dataKey);
			if (!prop) {
				continue;
			}

			if (
				prop.typeOptions?.password &&
				(!(copiedData[dataKey] as string).startsWith('=') || prop.noDataExpression)
			) {
				copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
			}
		}

		return copiedData;
	}

	private unredactRestoreValues(unmerged: any, replacement: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		for (const [key, value] of Object.entries(unmerged)) {
			if (value === CREDENTIAL_BLANKING_VALUE) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				unmerged[key] = replacement[key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				key in replacement &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				typeof replacement[key] === 'object' &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				replacement[key] !== null
			) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}

	// Take unredacted data (probably from the DB) and merge it with
	// redacted data to create an unredacted version.
	unredact(redactedData: IDataObject, savedData: IDataObject): IDataObject {
		// Replace any blank sentinel values with their saved version
		const mergedData = deepCopy(redactedData ?? {});
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
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
