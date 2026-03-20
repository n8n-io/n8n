import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class N8nAiGatewayApi implements ICredentialType {
	name = 'n8nAiGatewayApi';

	displayName = 'N8n AI Gateway';

	documentationUrl = 'n8naigateway';

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
			name: 'url',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Default Category',
			name: 'defaultCategory',
			type: 'hidden',
			default: 'balanced',
		},
		{
			displayName: 'Default Model',
			name: 'defaultModel',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Category Map',
			name: 'categoryMap',
			type: 'hidden',
			default: '{}',
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
			baseURL: '={{ $credentials.url }}',
			url: '/models',
			method: 'GET',
		},
	};
}
