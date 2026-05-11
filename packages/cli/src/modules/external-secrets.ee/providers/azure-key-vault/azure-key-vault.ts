import type { SecretClient } from '@azure/keyvault-secrets';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { ensureError, type INodeProperties, UnexpectedError } from 'n8n-workflow';

import type { AzureKeyVaultContext } from './types';
import { DOCS_HELP_NOTICE } from '../../constants';
import { SecretsProvider } from '../../types';

export class AzureKeyVault extends SecretsProvider {
	name = 'azureKeyVault';

	displayName = 'Azure Key Vault';

	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
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
		const { vaultName, tenantId, clientId, clientSecret } = this.settings;

		const { ClientSecretCredential } = await import('@azure/identity');
		const { SecretClient } = await import('@azure/keyvault-secrets');

		const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
		this.client = new SecretClient(`https://${vaultName}.vault.azure.net/`, credential);

		this.logger.debug('Azure Key Vault provider connected');
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		if (!this.client) return [false, 'Failed to connect to Azure Key Vault'];

		try {
			await this.client.listPropertiesOfSecrets().next();
			return [true];
		} catch (error: unknown) {
			return [false, error instanceof Error ? error.message : 'Unknown error'];
		}
	}

	async disconnect() {
		// unused
	}

	async update() {
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
		for (const [index, promiseResult] of promises.entries()) {
			if (promiseResult.status === 'fulfilled') {
				const { name, value } = promiseResult.value;
				if (value !== undefined) updated[name] = value;
			} else {
				const error = ensureError(promiseResult.reason);
				readErrors.push(error);
				this.logger.warn(`Could not read Azure Key Vault secret "${secretNames[index]}"`, {
					error,
				});
			}
		}

		if (secretNames.length > 0 && Object.keys(updated).length === 0 && readErrors.length > 0) {
			throw new UnexpectedError('Could not read any secrets from Azure Key Vault', {
				cause: readErrors[0],
			});
		}

		this.cachedSecrets = updated;
		this.logger.debug('Azure Key Vault provider secrets updated');
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
}
