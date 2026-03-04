import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AgentVaultApi implements ICredentialType {
	name = 'agentVaultApi';

	displayName = 'AgentVault API';

	documentationUrl = 'agentVault';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:6125',
			placeholder: 'https://vault.example.com',
			description: 'The base URL of your AgentVault server',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your AgentVault API authentication key',
			required: true,
		},
		{
			displayName: 'Organization ID',
			name: 'organizationId',
			type: 'string',
			default: '',
			placeholder: 'org-123',
			description: 'Optional organization identifier for multi-tenant setups',
		},
	];
}
