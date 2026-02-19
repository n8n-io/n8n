import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AzureOpenAiApi implements ICredentialType {
	name = 'azureOpenAiApi';

	displayName = 'Azure Open AI';

	documentationUrl = 'azureopenai';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Resource Name',
			name: 'resourceName',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			required: true,
			default: '2025-03-01-preview',
		},
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: undefined,
			placeholder: 'https://westeurope.api.cognitive.microsoft.com',
		},
		{
			displayName: 'Approved Models',
			name: 'approvedModels',
			type: 'string',
			default: '',
			description:
				'Comma-separated list of approved model/deployment names for the dropdown (e.g., "gpt-4o,gpt-4o-mini,o3-mini"). Leave empty to allow manual entry.',
			placeholder: 'gpt-4o,gpt-4o-mini,o3-mini',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};
}
