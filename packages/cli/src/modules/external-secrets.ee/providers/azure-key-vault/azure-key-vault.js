'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
exports.AzureKeyVault = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('../../constants');
class AzureKeyVault {
	constructor(logger = di_1.Container.get(backend_common_1.Logger)) {
		this.logger = logger;
		this.name = 'azureKeyVault';
		this.displayName = 'Azure Key Vault';
		this.state = 'initializing';
		this.properties = [
			constants_1.DOCS_HELP_NOTICE,
			{
				displayName: 'Vault Name',
				hint: 'The name of your existing Azure Key Vault.',
				name: 'vaultName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. my-vault',
				noDataExpression: true,
			},
			{
				displayName: 'Tenant ID',
				name: 'tenantId',
				hint: 'In Azure, this can be called "Directory (Tenant) ID".',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. 7dec9324-7074-72b7-a3ca-a9bb3012f466',
				noDataExpression: true,
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				hint: 'In Azure, this can be called "Application (Client) ID".',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. 7753d8c2-e41f-22ed-3dd7-c9e96463622c',
				typeOptions: { password: true },
				noDataExpression: true,
			},
			{
				displayName: 'Client Secret',
				name: 'clientSecret',
				hint: 'The client secret value of your registered application.',
				type: 'string',
				default: '',
				required: true,
				typeOptions: { password: true },
				noDataExpression: true,
			},
		];
		this.cachedSecrets = {};
		this.logger = this.logger.scoped('external-secrets');
	}
	async init(context) {
		this.settings = context.settings;
		this.logger.debug('Azure Key Vault provider initialized');
	}
	async connect() {
		const { vaultName, tenantId, clientId, clientSecret } = this.settings;
		const { ClientSecretCredential } = await Promise.resolve().then(() =>
			__importStar(require('@azure/identity')),
		);
		const { SecretClient } = await Promise.resolve().then(() =>
			__importStar(require('@azure/keyvault-secrets')),
		);
		try {
			const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
			this.client = new SecretClient(`https://${vaultName}.vault.azure.net/`, credential);
			this.state = 'connected';
			this.logger.debug('Azure Key Vault provider connected');
		} catch (error) {
			this.state = 'error';
			this.logger.error('Azure Key Vault provider failed to connect', {
				error: (0, n8n_workflow_1.ensureError)(error),
			});
		}
	}
	async test() {
		if (!this.client) return [false, 'Failed to connect to Azure Key Vault'];
		try {
			await this.client.listPropertiesOfSecrets().next();
			return [true];
		} catch (error) {
			return [false, error instanceof Error ? error.message : 'Unknown error'];
		}
	}
	async disconnect() {}
	async update() {
		const secretNames = [];
		for await (const secret of this.client.listPropertiesOfSecrets()) {
			secretNames.push(secret.name);
		}
		const promises = secretNames
			.filter((name) => constants_1.EXTERNAL_SECRETS_NAME_REGEX.test(name))
			.map(async (name) => {
				const { value } = await this.client.getSecret(name);
				return { name, value };
			});
		const secrets = await Promise.all(promises);
		this.cachedSecrets = secrets.reduce((acc, cur) => {
			if (cur.value === undefined) return acc;
			acc[cur.name] = cur.value;
			return acc;
		}, {});
		this.logger.debug('Azure Key Vault provider secrets updated');
	}
	getSecret(name) {
		return this.cachedSecrets[name];
	}
	hasSecret(name) {
		return name in this.cachedSecrets;
	}
	getSecretNames() {
		return Object.keys(this.cachedSecrets);
	}
}
exports.AzureKeyVault = AzureKeyVault;
//# sourceMappingURL=azure-key-vault.js.map
