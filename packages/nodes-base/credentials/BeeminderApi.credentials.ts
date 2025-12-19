import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BeeminderApi implements ICredentialType {
	name = 'beeminderApi';

	displayName = 'Beeminder API';

	documentationUrl = 'beeminder';

	properties: INodeProperties[] = [
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			body: {
				auth_token: '={{$credentials.authToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.beeminder.com/api/v1',
			url: '/users/me.json',
		},
	};
}
