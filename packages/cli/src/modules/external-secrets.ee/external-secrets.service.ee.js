'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExternalSecretsService = void 0;
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('@/constants');
const external_secrets_manager_ee_1 = require('./external-secrets-manager.ee');
let ExternalSecretsService = class ExternalSecretsService {
	getProvider(providerName) {
		const providerAndSettings = di_1.Container.get(
			external_secrets_manager_ee_1.ExternalSecretsManager,
		).getProviderWithSettings(providerName);
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
	async getProviders() {
		return di_1.Container.get(external_secrets_manager_ee_1.ExternalSecretsManager)
			.getProvidersWithSettings()
			.map(({ provider, settings }) => ({
				displayName: provider.displayName,
				name: provider.name,
				icon: provider.name,
				state: provider.state,
				connected: !!settings.connected,
				connectedAt: settings.connectedAt,
				data: this.redact(settings.settings, provider),
			}));
	}
	redact(data, provider) {
		const copiedData = (0, n8n_workflow_1.deepCopy)(data || {});
		const properties = provider.properties;
		for (const dataKey of Object.keys(copiedData)) {
			if (dataKey === 'oauthTokenData') {
				copiedData[dataKey] = constants_1.CREDENTIAL_BLANKING_VALUE;
				continue;
			}
			const prop = properties.find((v) => v.name === dataKey);
			if (!prop) {
				continue;
			}
			if (
				prop.typeOptions?.password &&
				(!copiedData[dataKey].startsWith('=') || prop.noDataExpression)
			) {
				copiedData[dataKey] = constants_1.CREDENTIAL_BLANKING_VALUE;
			}
		}
		return copiedData;
	}
	unredactRestoreValues(unmerged, replacement) {
		for (const [key, value] of Object.entries(unmerged)) {
			if (value === constants_1.CREDENTIAL_BLANKING_VALUE) {
				unmerged[key] = replacement[key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				key in replacement &&
				typeof replacement[key] === 'object' &&
				replacement[key] !== null
			) {
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}
	unredact(redactedData, savedData) {
		const mergedData = (0, n8n_workflow_1.deepCopy)(redactedData ?? {});
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
	}
	async saveProviderSettings(providerName, data, userId) {
		const providerAndSettings = di_1.Container.get(
			external_secrets_manager_ee_1.ExternalSecretsManager,
		).getProviderWithSettings(providerName);
		const { settings } = providerAndSettings;
		const newData = this.unredact(data, settings.settings);
		await di_1.Container.get(
			external_secrets_manager_ee_1.ExternalSecretsManager,
		).setProviderSettings(providerName, newData, userId);
	}
	async saveProviderConnected(providerName, connected) {
		await di_1.Container.get(
			external_secrets_manager_ee_1.ExternalSecretsManager,
		).setProviderConnected(providerName, connected);
		return this.getProvider(providerName);
	}
	getAllSecrets() {
		return di_1.Container.get(
			external_secrets_manager_ee_1.ExternalSecretsManager,
		).getAllSecretNames();
	}
	async testProviderSettings(providerName, data) {
		const providerAndSettings = di_1.Container.get(
			external_secrets_manager_ee_1.ExternalSecretsManager,
		).getProviderWithSettings(providerName);
		const { settings } = providerAndSettings;
		const newData = this.unredact(data, settings.settings);
		return await di_1.Container.get(
			external_secrets_manager_ee_1.ExternalSecretsManager,
		).testProviderSettings(providerName, newData);
	}
	async updateProvider(providerName) {
		return await di_1.Container.get(
			external_secrets_manager_ee_1.ExternalSecretsManager,
		).updateProvider(providerName);
	}
};
exports.ExternalSecretsService = ExternalSecretsService;
exports.ExternalSecretsService = ExternalSecretsService = __decorate(
	[(0, di_1.Service)()],
	ExternalSecretsService,
);
//# sourceMappingURL=external-secrets.service.ee.js.map
