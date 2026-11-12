import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BannerbearV5Api implements ICredentialType {
	name = 'bannerbearV5Api';

	displayName = 'Bannerbear API (V5)';

	documentationUrl = 'bannerbear';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Workspace API key from the Developers / API Keys page. It starts with bb_ak_v5_.',
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
			baseURL: 'https://api.bannerbear.com/v5',
			url: '/account',
		},
	};
}
