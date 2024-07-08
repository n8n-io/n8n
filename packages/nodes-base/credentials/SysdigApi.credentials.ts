import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SysdigApi implements ICredentialType {
	name = 'sysdigApi';

	displayName = 'Sysdig API';

	documentationUrl = 'sysdig';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.malcore.io/api',
			url: '/urlcheck',
			method: 'POST',
			body: { url: 'google.com' },
		},
	};
}
