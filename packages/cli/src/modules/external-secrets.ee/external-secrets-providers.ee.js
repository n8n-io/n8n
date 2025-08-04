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
exports.ExternalSecretsProviders = void 0;
const di_1 = require('@n8n/di');
const aws_secrets_manager_1 = require('./providers/aws-secrets-manager');
const azure_key_vault_1 = require('./providers/azure-key-vault/azure-key-vault');
const gcp_secrets_manager_1 = require('./providers/gcp-secrets-manager/gcp-secrets-manager');
const infisical_1 = require('./providers/infisical');
const vault_1 = require('./providers/vault');
let ExternalSecretsProviders = class ExternalSecretsProviders {
	constructor() {
		this.providers = {
			awsSecretsManager: aws_secrets_manager_1.AwsSecretsManager,
			infisical: infisical_1.InfisicalProvider,
			vault: vault_1.VaultProvider,
			azureKeyVault: azure_key_vault_1.AzureKeyVault,
			gcpSecretsManager: gcp_secrets_manager_1.GcpSecretsManager,
		};
	}
	getProvider(name) {
		return this.providers[name];
	}
	hasProvider(name) {
		return name in this.providers;
	}
	getAllProviders() {
		return this.providers;
	}
};
exports.ExternalSecretsProviders = ExternalSecretsProviders;
exports.ExternalSecretsProviders = ExternalSecretsProviders = __decorate(
	[(0, di_1.Service)()],
	ExternalSecretsProviders,
);
//# sourceMappingURL=external-secrets-providers.ee.js.map
