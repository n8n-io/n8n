import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AzureOpenAiClientApi implements ICredentialType {
	name = 'azureOpenAiClientApi';

	displayName = 'Azure Open AI Client Credentials';

	documentationUrl = 'azureopenai';

	properties: INodeProperties[] = [
		{
			displayName: 'Client Id',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Resource Name',
			name: 'resourceName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			required: true,
			default: '2024-12-01-preview',
		},
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: 'https://chat-ai.cisco.com',
			placeholder: 'https://chat-ai.cisco.com',
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
