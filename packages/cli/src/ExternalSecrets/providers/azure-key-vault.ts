import type { SecretsProvider, SecretsProviderState } from '@/Interfaces';
import type { INodeProperties } from 'n8n-workflow';

export class AzureKeyVault implements SecretsProvider {
	name = 'azureKeyVault';

	displayName = 'Azure Key Vault';

	state: SecretsProviderState = 'initializing';

	properties: INodeProperties[] = [
		{
			displayName:
				'Need help filling out these fields? <a href="https://docs.n8n.io/external-secrets/#connect-n8n-to-your-secrets-store" target="_blank">Open docs</a>',
			name: 'notice',
			type: 'notice',
			default: '',
			noDataExpression: true,
		},
		{
			displayName: 'Vault Name',
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
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. 7dec9324-7074-72b7-a3ca-a9bb3012f466',
			noDataExpression: true,
			displayOptions: {
				show: {
					authMethod: ['iamUser'],
				},
			},
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
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
			type: 'string',
			default: '',
			required: true,
			typeOptions: { password: true },
			noDataExpression: true,
		},
	];

	private cachedSecrets: Record<string, string> = {};

	async init() {
		// ...
	}

	async test() {
		// ...
		return [true] as [boolean];
	}

	async connect() {
		// ...
	}

	async disconnect() {
		return;
	}

	async update() {
		// ...
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
