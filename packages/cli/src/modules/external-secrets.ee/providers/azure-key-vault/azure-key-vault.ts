import { AuthenticationError } from '@azure/identity';
import type { SecretClient } from '@azure/keyvault-secrets';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { type INodeProperties, UnexpectedError } from 'n8n-workflow';

import type { AzureKeyVaultContext, AzureKeyVaultEnvironment } from './types';
import { DOCS_HELP_NOTICE } from '../../constants';
import {
	buildFailureSummaryLogContext,
	type HttpProviderErrorLogContext,
	type LogContext,
	logSecretsProviderOperationFailure,
	type SafeContextValue,
	type SecretsProviderOperationFailureParams,
} from '../../errors/secrets-provider-errors';
import { SecretsProvider } from '../../types';

type AzureHttpLikeError = Error & {
	statusCode?: number;
	code?: string;
};

const DEFAULT_AUTHORITY_HOST = 'https://login.microsoftonline.com';

const AZURE_CLOUD_ENDPOINTS: Record<
	Exclude<AzureKeyVaultEnvironment, 'custom'>,
	{ vaultSuffix: string; authorityHost: string }
> = {
	public: {
		vaultSuffix: 'vault.azure.net',
		authorityHost: DEFAULT_AUTHORITY_HOST,
	},
	usGovernment: {
		vaultSuffix: 'vault.usgovcloudapi.net',
		authorityHost: 'https://login.microsoftonline.us',
	},
	china: {
		vaultSuffix: 'vault.azure.cn',
		authorityHost: 'https://login.partner.microsoftonline.cn',
	},
};

export class AzureKeyVault extends SecretsProvider {
	name = 'azureKeyVault';

	displayName = 'Azure Key Vault';

	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
		{
			displayName: 'Azure Cloud',
			name: 'environment',
			hint: 'The Azure cloud environment your Key Vault is hosted in.',
			type: 'options',
			options: [
				{
					name: 'Azure Public Cloud',
					value: 'public',
					description:
						'Uses <code>vault.azure.net</code> and <code>login.microsoftonline.com</code>',
				},
				{
					name: 'Azure US Government',
					value: 'usGovernment',
					description:
						'Uses <code>vault.usgovcloudapi.net</code> and <code>login.microsoftonline.us</code>',
				},
				{
					name: 'Azure China',
					value: 'china',
					description:
						'Uses <code>vault.azure.cn</code> and <code>login.partner.microsoftonline.cn</code>',
				},
				{
					name: 'Custom',
					value: 'custom',
					description:
						'Provide the vault URL and authority host directly, for setups such as Azure Stack or proxied environments',
				},
			],
			default: 'public',
			noDataExpression: true,
		},
		{
			displayName: 'Vault Name',
			hint: 'The name of your existing Azure Key Vault.',
			name: 'vaultName',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. my-vault',
			noDataExpression: true,
			displayOptions: {
				hide: {
					environment: ['custom'],
				},
			},
		},
		{
			displayName: 'Vault URL',
			hint: 'The full URL of your existing Azure Key Vault.',
			name: 'vaultUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. https://my-vault.vault.usgovcloudapi.net',
			noDataExpression: true,
			displayOptions: {
				show: {
					environment: ['custom'],
				},
			},
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
		{
			displayName: 'Authority Host',
			hint: 'The Microsoft Entra authority to authenticate against. Leave empty to use the default (https://login.microsoftonline.com).',
			name: 'authorityHost',
			type: 'string',
			default: '',
			placeholder: 'e.g. https://login.microsoftonline.us',
			noDataExpression: true,
			displayOptions: {
				show: {
					environment: ['custom'],
				},
			},
		},
	];

	private cachedSecrets: Record<string, string> = {};

	private client: SecretClient;

	private settings: AzureKeyVaultContext['settings'];

	constructor(private readonly logger = Container.get(Logger)) {
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(context: AzureKeyVaultContext) {
		this.settings = context.settings;

		this.logger.debug('Azure Key Vault provider initialized');
	}

	protected async doConnect(): Promise<void> {
		try {
			const { tenantId, clientId, clientSecret } = this.settings;
			const { vaultUrl, authorityHost } = this.resolveEndpoints();

			const { ClientSecretCredential } = await import('@azure/identity');
			const { SecretClient } = await import('@azure/keyvault-secrets');

			// TODO: Not routed through OutboundHttp for now. It would require `@azure/core-rest-pipeline`, which is not worth it just to share agents.
			const credential = new ClientSecretCredential(tenantId, clientId, clientSecret, {
				authorityHost,
			});
			this.client = new SecretClient(vaultUrl, credential);

			this.logger.debug('Azure Key Vault provider connected');
		} catch (error) {
			this.logOperationFailure('Failed to connect Azure Key Vault provider', {
				operation: 'connect',
				error,
				context: this.azureErrorContext(error),
			});
			throw error;
		}
	}

	private resolveEndpoints(): { vaultUrl: string; authorityHost: string } {
		const { environment = 'public', vaultName, vaultUrl, authorityHost } = this.settings;

		if (environment === 'custom') {
			const trimmedAuthorityHost = authorityHost?.trim();
			return {
				vaultUrl: (vaultUrl ?? '').trim(),
				authorityHost: trimmedAuthorityHost ? trimmedAuthorityHost : DEFAULT_AUTHORITY_HOST,
			};
		}

		const cloudEndpoints = AZURE_CLOUD_ENDPOINTS[environment];
		return {
			vaultUrl: `https://${vaultName}.${cloudEndpoints.vaultSuffix}/`,
			authorityHost: cloudEndpoints.authorityHost,
		};
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		if (!this.client) return [false, 'Failed to connect to Azure Key Vault'];

		try {
			await this.client.listPropertiesOfSecrets().next();
			return [true];
		} catch (error: unknown) {
			this.logOperationFailure('Azure Key Vault provider test failed', {
				operation: 'test',
				error,
				context: this.azureErrorContext(error),
			});
			return [false, error instanceof Error ? error.message : 'Unknown error'];
		}
	}

	async disconnect() {
		// unused
	}

	async update() {
		try {
			const secretNames: string[] = [];
			for await (const secret of this.client.listPropertiesOfSecrets()) {
				if (secret.enabled === false) continue;
				secretNames.push(secret.name);
			}

			const promises = await Promise.allSettled(
				secretNames.map(async (name) => {
					const { value } = await this.client.getSecret(name);
					return { name, value };
				}),
			);

			const updated: Record<string, string> = {};
			const readErrors: Error[] = [];
			const failedSecrets: Array<{ name: string; errorCode: SafeContextValue }> = [];
			for (const [index, promiseResult] of promises.entries()) {
				if (promiseResult.status === 'fulfilled') {
					const { name, value } = promiseResult.value;
					if (value !== undefined) updated[name] = value;
				} else {
					const error = ensureError(promiseResult.reason);
					readErrors.push(error);
					const secretName = secretNames[index];
					const errorContext = this.azureErrorContext(error);
					this.logger.debug(`Could not read Azure Key Vault secret "${secretName}"`, {
						providerName: this.name,
						operation: 'update',
						vaultName: this.settings.vaultName,
						secretName,
						...errorContext,
					});
					failedSecrets.push({
						name: secretName,
						errorCode: errorContext.errorCode ?? 'unknown',
					});
				}
			}

			const failureSummary = buildFailureSummaryLogContext(failedSecrets);
			const isTotalFailure =
				secretNames.length > 0 && Object.keys(updated).length === 0 && readErrors.length > 0;

			if (failureSummary && !isTotalFailure) {
				this.logOperationFailure('Skipped unreadable Azure Key Vault secrets during update', {
					operation: 'update',
					error:
						readErrors[0] ?? new Error('One or more Azure Key Vault secrets could not be read'),
					context: {
						...this.azureErrorContext(readErrors[0]),
						...failureSummary,
					},
				});
			}

			if (isTotalFailure) {
				const error = readErrors[0];
				this.logOperationFailure('Could not read any secrets from Azure Key Vault', {
					operation: 'update',
					error,
					context: {
						...this.azureErrorContext(error),
						...failureSummary,
					},
				});
				throw new UnexpectedError('Could not read any secrets from Azure Key Vault', {
					cause: error,
				});
			}

			this.cachedSecrets = updated;
			this.logger.debug('Azure Key Vault provider secrets updated');
		} catch (error) {
			if (error instanceof UnexpectedError) {
				throw error;
			}

			this.logOperationFailure('Failed to update Azure Key Vault provider secrets', {
				operation: 'update',
				error,
				context: this.azureErrorContext(error),
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

	private isAzureHttpLikeError(error: unknown): error is AzureHttpLikeError {
		if (!(error instanceof Error)) return false;

		const candidate = error as AzureHttpLikeError;
		return (
			error.name === 'RestError' ||
			typeof candidate.statusCode === 'number' ||
			typeof candidate.code === 'string'
		);
	}

	private azureErrorContext(error: unknown): HttpProviderErrorLogContext {
		if (error instanceof AuthenticationError) {
			return {
				statusCode: error.statusCode,
				errorCode: error.errorResponse?.error,
			};
		}

		if (this.isAzureHttpLikeError(error)) {
			return {
				statusCode: error.statusCode,
				errorCode: error.code,
			};
		}

		if (error instanceof Error) {
			return { errorCode: error.name };
		}

		return {};
	}

	private logOperationFailure(
		message: string,
		params: SecretsProviderOperationFailureParams,
	): void {
		const context: LogContext = { ...params.context };
		if (this.settings?.vaultName) {
			context.vaultName = this.settings.vaultName;
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
