import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TogglApi implements ICredentialType {
	name = 'togglApi';

	displayName = 'Toggl API';

	documentationUrl = 'toggl';

	properties: INodeProperties[] = [
		{
			displayName: 'Email Address',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.track.toggl.com/api/v9',
			url: '/me',
		},
	};
}
