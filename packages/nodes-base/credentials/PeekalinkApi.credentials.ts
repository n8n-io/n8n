import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PeekalinkApi implements ICredentialType {
	name = 'peekalinkApi';

	displayName = 'Peekalink API';

	documentationUrl = 'peekalink';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
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
			baseURL: 'https://api.peekalink.io',
			url: '/',
			method: 'POST',
			body: {
				link: 'https://www.example.com',
			},
		},
	};
}
