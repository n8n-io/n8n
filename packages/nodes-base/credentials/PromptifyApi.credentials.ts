import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PromptifyApi implements ICredentialType {
	name = 'promptifyApi';
	displayName = 'Promptify API';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
			typeOptions: { password: true },
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				'api_token': '={{$credentials.apiToken}}'
			},
			headers: {
				Authorization: '={{"Token " + $credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://promptify.adtitan.io/api',
			url: '/me',
		},
	};
}
