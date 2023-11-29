import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CohereApi implements ICredentialType {
	name = 'cohereApi';

	displayName = 'CohereApi';

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
			baseURL: 'https://api.cohere.ai',
			url: '/v1/detect-language',
			method: 'POST',
			body: {
				texts: ['hello'],
			},
		},
	};
}
