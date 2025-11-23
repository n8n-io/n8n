import type { SecretClient } from '@azure/keyvault-secrets';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { ensureError } from 'n8n-workflow';
import type { INodeProperties } from 'n8n-workflow';

import type { AzureKeyVaultContext } from './types';
import { DOCS_HELP_NOTICE, EXTERNAL_SECRETS_NAME_REGEX } from '../../constants';
import type { SecretsProvider, SecretsProviderState } from '../../types';

export class AzureKeyVault implements SecretsProvider {
	name = 'azureKeyVault';

	displayName = 'Azure Key Vault';

	state: SecretsProviderState = 'initializing';

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
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(context: AzureKeyVaultContext) {
		this.settings = context.settings;

		this.logger.debug('Azure Key Vault provider initialized');
	}

	async connect() {
		const { vaultName, tenantId, clientId, clientSecret } = this.settings;

		const { ClientSecretCredential } = await import('@azure/identity');
		const { SecretClient } = await import('@azure/keyvault-secrets');

		try {
			const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
			this.client = new SecretClient(`https://${vaultName}.vault.azure.net/`, credential);
			this.state = 'connected';
			this.logger.debug('Azure Key Vault provider connected');
		} catch (error) {
			this.state = 'error';
			this.logger.error('Azure Key Vault provider failed to connect', {
				error: ensureError(error),
			});
		}
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
			secretNames.push(secret.name);
		}

		const promises = secretNames
			.filter((name) => EXTERNAL_SECRETS_NAME_REGEX.test(name))
			.map(async (name) => {
				const { value } = await this.client.getSecret(name);
				return { name, value };
			});

		const secrets = await Promise.all(promises);

		this.cachedSecrets = secrets.reduce<Record<string, string>>((acc, cur) => {
			if (cur.value === undefined) return acc;
			acc[cur.name] = cur.value;
			return acc;
		}, {});

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
