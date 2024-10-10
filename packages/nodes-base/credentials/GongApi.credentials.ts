import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GongApi implements ICredentialType {
	name = 'gongApi';

	displayName = 'Gong API';

	documentationUrl = 'https://gong.app.gong.io/settings/api/documentation';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.gong.io',
		},
		{
			displayName: 'Access Key',
			name: 'accessKey',
			// eslint-disable-next-line n8n-nodes-base/cred-class-field-type-options-password-missing
			type: 'string',
			default: '',
		},
		{
			displayName: 'Access Key Secret',
			name: 'accessKeySecret',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{ $credentials.accessKey }}',
				password: '={{ $credentials.accessKeySecret }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
			url: '/v2/users',
		},
	};
}
