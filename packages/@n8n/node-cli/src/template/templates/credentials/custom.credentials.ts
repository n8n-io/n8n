import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ExampleApi implements ICredentialType {
	name = 'exampleApi';

	displayName = 'Example API';

	// Link to your community node's README
	documentationUrl = 'https://github.com/org/repo?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			body: {
				token: '={{$credentials.accessToken}}',
			},
			qs: {
				token: '={{$credentials.accessToken}}',
			},
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.example.com/v2',
			url: '/v1/user',
		},
	};
}
