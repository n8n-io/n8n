import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CurrentsApi implements ICredentialType {
	name = 'currentsApi';

	displayName = 'Currents API';

	documentationUrl = 'https://docs.currents.dev/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API key from Currents Dashboard (Organization > API & Record Keys)',
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
			baseURL: 'https://api.currents.dev/v1',
			url: '/projects',
			method: 'GET',
		},
	};
}
