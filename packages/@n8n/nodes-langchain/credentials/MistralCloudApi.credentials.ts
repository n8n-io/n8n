import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MistralCloudApi implements ICredentialType {
	name = 'mistralCloudApi';

	displayName = 'Mistral API';

	documentationUrl = 'mistral';

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
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			required: true,
			default: 'https://api.mistral.ai',
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
			baseURL: '={{$credentials.endpoint}}/v1',
			url: '/models',
			method: 'GET',
		},
	};
}
