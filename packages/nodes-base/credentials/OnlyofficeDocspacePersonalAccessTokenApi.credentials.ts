import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OnlyofficeDocspacePersonalAccessTokenApi implements ICredentialType {
	name = 'onlyofficeDocspacePersonalAccessTokenApi';

	displayName = 'ONLYOFFICE DocSpace Personal Access Token API';

	documentationUrl = 'onlyofficeDocspace';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			description: 'The base URL of your ONLYOFFICE DocSpace portal',
			placeholder: 'https://yourportal.onlyoffice.com',
			required: true,
		},
		{
			displayName: 'Personal Access Token',
			name: 'personalAccessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'The personal access token for your ONLYOFFICE DocSpace portal',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{$credentials?.personalAccessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: 'api/2.0/authentication',
			baseURL: '={{$credentials?.baseUrl}}',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'response',
					value: false,
					message: 'Invalid Personal Access Token',
				},
			},
		],
	};
}
