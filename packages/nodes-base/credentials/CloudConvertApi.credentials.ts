import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CloudConvertApi implements ICredentialType {
	name = 'cloudConvertApi';

	displayName = 'CloudConvert API';

	documentationUrl = 'https://cloudconvert.com/dashboard/api/v2/keys';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			description:
				'The API Key can be generated on your dashboard. The n8n nodes requires the "user.read", "task.read" and "task.write" scopes.',
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
			baseURL: 'https://api.cloudconvert.com/v2',
			url: '/me',
		},
	};
}
