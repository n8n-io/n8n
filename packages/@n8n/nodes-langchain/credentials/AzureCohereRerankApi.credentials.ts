import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AzureCohereRerankApi implements ICredentialType {
	name = 'azureCohereRerankApi';

	displayName = 'Azure Cohere Rerank API';

	documentationUrl = 'cohere';

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
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://<resource>.services.ai.azure.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
}
