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
			default: '2023-07-01-preview',
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
