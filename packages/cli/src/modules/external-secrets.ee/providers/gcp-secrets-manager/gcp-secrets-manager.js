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
exports.GcpSecretsManager = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('../../constants');
class GcpSecretsManager {
	constructor(logger = di_1.Container.get(backend_common_1.Logger)) {
		this.logger = logger;
		this.name = 'gcpSecretsManager';
		this.displayName = 'GCP Secrets Manager';
		this.state = 'initializing';
		this.properties = [
			constants_1.DOCS_HELP_NOTICE,
			{
				displayName: 'Service Account Key',
				name: 'serviceAccountKey',
				type: 'string',
				default: '',
				required: true,
				typeOptions: { password: true },
				placeholder: 'e.g. { "type": "service_account", "project_id": "gcp-secrets-store", ... }',
				hint: 'Content of JSON file downloaded from Google Cloud Console.',
				noDataExpression: true,
			},
		];
		this.cachedSecrets = {};
		this.logger = this.logger.scoped('external-secrets');
	}
	async init(context) {
		this.settings = this.parseSecretAccountKey(context.settings.serviceAccountKey);
	}
	async connect() {
		const { projectId, privateKey, clientEmail } = this.settings;
		const { SecretManagerServiceClient: GcpClient } = await Promise.resolve().then(() =>
			__importStar(require('@google-cloud/secret-manager')),
		);
		try {
			this.client = new GcpClient({
				credentials: { client_email: clientEmail, private_key: privateKey },
				projectId,
			});
			this.state = 'connected';
			this.logger.debug('GCP Secrets Manager provider connected');
		} catch (error) {
			this.state = 'error';
			this.logger.debug('GCP Secrets Manager provider failed to connect', {
				error: (0, n8n_workflow_1.ensureError)(error),
			});
		}
	}
	async test() {
		if (!this.client) return [false, 'Failed to connect to GCP Secrets Manager'];
		try {
			await this.client.initialize();
			return [true];
		} catch (error) {
			return [false, error instanceof Error ? error.message : 'Unknown error'];
		}
	}
	async disconnect() {}
	async update() {
		const { projectId } = this.settings;
		const [rawSecretNames] = await this.client.listSecrets({
			parent: `projects/${projectId}`,
		});
		const secretNames = rawSecretNames.reduce((acc, cur) => {
			if (!cur.name || !constants_1.EXTERNAL_SECRETS_NAME_REGEX.test(cur.name)) return acc;
			const secretName = cur.name.split('/').pop();
			if (secretName) acc.push(secretName);
			return acc;
		}, []);
		const promises = secretNames.map(async (name) => {
			const versions = await this.client.accessSecretVersion({
				name: `projects/${projectId}/secrets/${name}/versions/latest`,
			});
			if (!Array.isArray(versions) || !versions.length) return null;
			const [latestVersion] = versions;
			if (!latestVersion.payload?.data) return null;
			const value = latestVersion.payload.data.toString();
			if (!value) return null;
			return { name, value };
		});
		const results = await Promise.all(promises);
		this.cachedSecrets = results.reduce((acc, cur) => {
			if (cur) acc[cur.name] = cur.value;
			return acc;
		}, {});
		this.logger.debug('GCP Secrets Manager provider secrets updated');
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
	parseSecretAccountKey(privateKey) {
		const parsed = (0, n8n_workflow_1.jsonParse)(privateKey, { fallbackValue: {} });
		return {
			projectId: parsed?.project_id ?? '',
			clientEmail: parsed?.client_email ?? '',
			privateKey: parsed?.private_key ?? '',
		};
	}
}
exports.GcpSecretsManager = GcpSecretsManager;
//# sourceMappingURL=gcp-secrets-manager.js.map
