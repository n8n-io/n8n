'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AwsSecretsManager = void 0;
const client_secrets_manager_1 = require('@aws-sdk/client-secrets-manager');
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const constants_1 = require('../constants');
const unknown_auth_type_error_1 = require('../errors/unknown-auth-type.error');
class AwsSecretsManager {
	constructor(logger = di_1.Container.get(backend_common_1.Logger)) {
		this.logger = logger;
		this.name = 'awsSecretsManager';
		this.displayName = 'AWS Secrets Manager';
		this.state = 'initializing';
		this.properties = [
			constants_1.DOCS_HELP_NOTICE,
			{
				displayName: 'Region',
				name: 'region',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. eu-west-3',
				noDataExpression: true,
			},
			{
				displayName: 'Authentication Method',
				name: 'authMethod',
				type: 'options',
				options: [
					{
						name: 'IAM User',
						value: 'iamUser',
						description:
							'Credentials for IAM user having <code>secretsmanager:ListSecrets</code> and <code>secretsmanager:BatchGetSecretValue</code> permissions. <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html" target="_blank">Learn more</a>',
					},
					{
						name: 'Auto Detect',
						value: 'autoDetect',
						description:
							'Use automatic credential detection to authenticate AWS calls for external secrets<a href="https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html#credchain" target="_blank">Learn more</a>.',
					},
				],
				default: 'iamUser',
				required: true,
				noDataExpression: true,
			},
			{
				displayName: 'Access Key ID',
				name: 'accessKeyId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. ACHXUQMBAQEVTE2RKMWP',
				noDataExpression: true,
				displayOptions: {
					show: {
						authMethod: ['iamUser'],
					},
				},
			},
			{
				displayName: 'Secret Access Key',
				name: 'secretAccessKey',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. cbmjrH/xNAjPwlQR3i/1HRSDD+esQX/Lan3gcmBc',
				typeOptions: { password: true },
				noDataExpression: true,
				displayOptions: {
					show: {
						authMethod: ['iamUser'],
					},
				},
			},
		];
		this.cachedSecrets = {};
		this.logger = this.logger.scoped('external-secrets');
	}
	async init(context) {
		this.assertAuthType(context);
		const { region, authMethod } = context.settings;
		const clientConfig = { region };
		if (authMethod === 'iamUser') {
			const { accessKeyId, secretAccessKey } = context.settings;
			clientConfig.credentials = { accessKeyId, secretAccessKey };
		}
		this.client = new client_secrets_manager_1.SecretsManager(clientConfig);
		this.logger.debug('AWS Secrets Manager provider initialized');
	}
	async test() {
		try {
			await this.client.listSecrets({ MaxResults: 1 });
			return [true];
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			return [false, error.message];
		}
	}
	async connect() {
		const [wasSuccessful, errorMsg] = await this.test();
		this.state = wasSuccessful ? 'connected' : 'error';
		if (wasSuccessful) {
			this.logger.debug('AWS Secrets Manager provider connected');
		} else {
			this.logger.error('AWS Secrets Manager provider failed to connect', { errorMsg });
		}
	}
	async disconnect() {
		return;
	}
	async update() {
		const secrets = await this.fetchAllSecrets();
		const supportedSecrets = secrets.filter((s) =>
			constants_1.EXTERNAL_SECRETS_NAME_REGEX.test(s.secretName),
		);
		this.cachedSecrets = Object.fromEntries(
			supportedSecrets.map((s) => [s.secretName, s.secretValue]),
		);
		this.logger.debug('AWS Secrets Manager provider secrets updated');
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
	assertAuthType(context) {
		const { authMethod } = context.settings;
		if (authMethod === 'iamUser' || authMethod === 'autoDetect') return;
		throw new unknown_auth_type_error_1.UnknownAuthTypeError(authMethod);
	}
	async fetchAllSecretsNames() {
		const names = [];
		let nextToken;
		do {
			const response = await this.client.listSecrets({
				NextToken: nextToken,
			});
			if (response.SecretList) {
				names.push(...response.SecretList.filter((s) => s.Name).map((s) => s.Name));
			}
			nextToken = response.NextToken;
		} while (nextToken);
		return names;
	}
	async fetchAllSecrets() {
		const secrets = [];
		const secretNames = await this.fetchAllSecretsNames();
		const batches = this.batch(secretNames);
		for (const batch of batches) {
			const response = await this.client.batchGetSecretValue({
				SecretIdList: batch,
			});
			if (response.SecretValues) {
				for (const secret of response.SecretValues) {
					if (secret.Name && secret.SecretString) {
						secrets.push({
							secretName: secret.Name,
							secretValue: secret.SecretString,
						});
					}
				}
			}
		}
		return secrets;
	}
	batch(arr, size = 20) {
		return Array.from({ length: Math.ceil(arr.length / size) }, (_, index) =>
			arr.slice(index * size, (index + 1) * size),
		);
	}
}
exports.AwsSecretsManager = AwsSecretsManager;
//# sourceMappingURL=aws-secrets-manager.js.map
