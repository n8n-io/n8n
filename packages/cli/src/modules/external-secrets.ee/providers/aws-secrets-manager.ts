import type { SecretsManager, SecretsManagerClientConfig } from '@aws-sdk/client-secrets-manager';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { type INodeProperties } from 'n8n-workflow';

import { DOCS_HELP_NOTICE } from '../constants';
import {
	logSecretsProviderOperationFailure,
	type LogContext,
	type SecretsProviderOperationFailureParams,
} from '../errors/secrets-provider-errors';
import { UnknownAuthTypeError } from '../errors/unknown-auth-type.error';
import { SecretsProvider, type SecretsProviderSettings } from '../types';

export type Secret = {
	secretName: string;
	secretValue: string;
};

export type AwsSecretsManagerSettings = {
	region: string;
	authMethod: 'iamUser' | 'autoDetect';
};

export type AwsSecretsManagerContext = SecretsProviderSettings<
	{
		region: string;
	} & (
		| {
				authMethod: 'iamUser';
				accessKeyId: string;
				secretAccessKey: string;
		  }
		| { authMethod: 'autoDetect' }
	)
>;

export class AwsSecretsManager extends SecretsProvider {
	name = 'awsSecretsManager';

	displayName = 'AWS Secrets Manager';

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

	private cachedSecrets: Record<string, string> = {};

	private client: SecretsManager;

	private settings: AwsSecretsManagerSettings;

	constructor(
		private readonly logger = Container.get(Logger),
		private readonly outboundHttp = Container.get(OutboundHttp),
	) {
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(context: AwsSecretsManagerContext) {
		const { region, authMethod } = context.settings;
		this.settings = { region, authMethod };

		try {
			this.assertAuthType(context);

			const clientConfig: SecretsManagerClientConfig = { region };

			if (authMethod === 'iamUser') {
				const { accessKeyId, secretAccessKey } = context.settings;
				clientConfig.credentials = { accessKeyId, secretAccessKey };
			}

			// Drive the AWS SDK's HTTP transport through n8n's outbound client,
			// so its calls reuse our agents (proxy + TLS) like every other outbound request.
			// SigV4 signing and the credential chain stay with the SDK.
			clientConfig.requestHandler = this.outboundHttp
				.transport({
					ssrf: 'disabled', // fixed AWS-resolved Secrets Manager host, not user-controlled
				})
				.getNodeAgent();

			const { SecretsManager } = await import('@aws-sdk/client-secrets-manager');
			this.client = new SecretsManager(clientConfig);

			this.logger.debug('AWS Secrets Manager provider initialized');
		} catch (error) {
			this.logOperationFailure('Failed to initialize AWS Secrets Manager provider', {
				operation: 'initialize',
				error,
			});
			throw error;
		}
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		try {
			await this.verifyConnection();
			return [true];
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			this.logOperationFailure('AWS Secrets Manager provider test failed', {
				operation: 'test',
				error,
				context: this.awsErrorContext(error),
			});
			return [false, error.message];
		}
	}

	protected async doConnect(): Promise<void> {
		try {
			await this.verifyConnection();

			this.logger.debug('AWS Secrets Manager provider connected');
		} catch (error) {
			this.logOperationFailure('Failed to connect AWS Secrets Manager provider', {
				operation: 'connect',
				error,
				context: this.awsErrorContext(error),
			});
			throw error;
		}
	}

	async disconnect() {
		return;
	}

	async update() {
		try {
			const secrets = await this.fetchAllSecrets();

			const supportedSecrets = secrets;

			this.cachedSecrets = Object.fromEntries(
				supportedSecrets.map((s) => [s.secretName, s.secretValue]),
			);

			this.logger.debug('AWS Secrets Manager provider secrets updated');
		} catch (error) {
			this.logOperationFailure('Failed to update AWS Secrets Manager provider secrets', {
				operation: 'update',
				error,
				context: this.awsErrorContext(error),
			});
			throw error;
		}
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
		const { authMethod } = context.settings;
		if (authMethod === 'iamUser' || authMethod === 'autoDetect') return;
		throw new UnknownAuthTypeError(authMethod);
	}

	private async fetchAllSecretsNames() {
		const names: string[] = [];
		let nextToken: string | undefined;

		do {
			const response = await this.client.listSecrets({
				NextToken: nextToken,
			});

			if (response.SecretList) {
				names.push(...response.SecretList.filter((s) => s.Name).map((s) => s.Name!));
			}

			nextToken = response.NextToken;
		} while (nextToken);

		return names;
	}

	private async fetchAllSecrets() {
		const secrets: Secret[] = [];
		const secretNames = await this.fetchAllSecretsNames();

		// Batch the requests to avoid hitting limits
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

	private batch<T>(arr: T[], size = 20): T[][] {
		return Array.from({ length: Math.ceil(arr.length / size) }, (_, index) =>
			arr.slice(index * size, (index + 1) * size),
		);
	}

	private async verifyConnection(): Promise<void> {
		await this.client.listSecrets({ MaxResults: 1 });
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	private getAwsErrorCode(error: unknown): string | number | undefined {
		if (this.isRecord(error)) {
			if ('Code' in error && typeof error.Code === 'string') {
				return error.Code;
			}

			if ('code' in error) {
				const { code } = error;
				if (typeof code === 'string' || typeof code === 'number') {
					return code;
				}
			}
		}

		if (error instanceof Error) {
			return error.name;
		}

		if (this.isRecord(error) && typeof error.name === 'string') {
			return error.name;
		}

		return undefined;
	}

	private awsErrorContext(error: unknown): LogContext {
		const context: LogContext = {};

		const errorCode = this.getAwsErrorCode(error);
		if (errorCode !== undefined) {
			context.errorCode = errorCode;
		}

		if (this.isRecord(error) && '$metadata' in error) {
			const metadata = error.$metadata;
			if (this.isRecord(metadata) && typeof metadata.httpStatusCode === 'number') {
				context.statusCode = metadata.httpStatusCode;
			}
		}

		return context;
	}

	private logOperationFailure(
		message: string,
		params: SecretsProviderOperationFailureParams,
	): void {
		const context: LogContext = { ...params.context };
		if (this.settings?.region) {
			context.region = this.settings.region;
		}
		if (this.settings?.authMethod) {
			context.authMethod = this.settings.authMethod;
		}

		logSecretsProviderOperationFailure({
			logger: this.logger,
			message,
			providerName: this.name,
			providerDisplayName: this.displayName,
			operation: params.operation,
			error: params.error,
			context,
		});
	}
}
