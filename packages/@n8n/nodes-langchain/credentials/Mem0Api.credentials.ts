import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Mem0Api implements ICredentialType {
	name = 'mem0Api';

	displayName = 'Mem0 API';

	documentationUrl = 'mem0';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'The API key to authenticate with Mem0',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Token {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.mem0.ai',
			url: '/v1/ping/',
			method: 'GET',
		},
	};
}
