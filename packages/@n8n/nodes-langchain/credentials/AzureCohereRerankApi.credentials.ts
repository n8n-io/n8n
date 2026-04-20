import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

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

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{ (() => { const cleaned = $credentials.baseUrl.trim().replace(new RegExp("/+$"), ""); const lower = cleaned.toLowerCase(); const fullMarker = "/providers/cohere/v2/rerank"; const marker = "/providers/cohere"; if (lower.includes(fullMarker)) { return `${cleaned.slice(0, lower.indexOf(fullMarker))}/providers/cohere`; } if (lower.includes(marker)) { return `${cleaned.slice(0, lower.indexOf(marker))}/providers/cohere`; } return `${cleaned}/providers/cohere`; })() }}',
			url: '/v2/models',
			method: 'GET',
		},
	};
}
