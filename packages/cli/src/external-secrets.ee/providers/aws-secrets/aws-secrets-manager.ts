import { Container } from '@n8n/di';
import { Logger } from 'n8n-core';
import type { INodeProperties } from 'n8n-workflow';

import { AwsSecretsClient } from './aws-secrets-client';
import type { AwsSecretsManagerContext } from './types';
import { DOCS_HELP_NOTICE, EXTERNAL_SECRETS_NAME_REGEX } from '../../constants';
import { UnknownAuthTypeError } from '../../errors/unknown-auth-type.error';
import type { SecretsProvider, SecretsProviderState } from '../../types';

export class AwsSecretsManager implements SecretsProvider {
	name = 'awsSecretsManager';

	displayName = 'AWS Secrets Manager';

	state: SecretsProviderState = 'initializing';

	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
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

	private cachedSecrets: Record<string, string> = {};

	private client: AwsSecretsClient;

	constructor(private readonly logger = Container.get(Logger)) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(context: AwsSecretsManagerContext) {
		this.assertAuthType(context);

		this.client = new AwsSecretsClient(context.settings);

		this.logger.debug('AWS Secrets Manager provider initialized');
	}

	async test() {
		return await this.client.checkConnection();
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
		const secrets = await this.client.fetchAllSecrets();

		const supportedSecrets = secrets.filter((s) => EXTERNAL_SECRETS_NAME_REGEX.test(s.secretName));

		this.cachedSecrets = Object.fromEntries(
			supportedSecrets.map((s) => [s.secretName, s.secretValue]),
		);

		this.logger.debug('AWS Secrets Manager provider secrets updated');
	}

	getSecret(name: string) {
		return this.cachedSecrets[name];
	}

	hasSecret(name: string) {
		return name in this.cachedSecrets;
	}

	getSecretNames() {
		return Object.keys(this.cachedSecrets);
	}

	private assertAuthType(context: AwsSecretsManagerContext) {
		if (context.settings.authMethod === 'iamUser') return;

		throw new UnknownAuthTypeError(context.settings.authMethod);
	}
}
