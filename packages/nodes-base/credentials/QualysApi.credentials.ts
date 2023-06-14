import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class QualysApi implements ICredentialType {
	name = 'qualysApi';

	displayName = 'Qualys API';

	properties: INodeProperties[] = [
		{
			displayName: 'username',
			name: 'accessToken',
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
			headers: {
				'X-Requested-With': 'n8n',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://qualysapi.qualys.com',
			url: '/api/2.0/fo/asset/host/?action=list',
		},
	};
}
