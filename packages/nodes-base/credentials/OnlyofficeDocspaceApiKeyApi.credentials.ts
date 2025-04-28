import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OnlyofficeDocspaceApiKeyApi implements ICredentialType {
	name = 'onlyofficeDocspaceApiKeyApi';

	displayName = 'ONLYOFFICE DocSpace API Key API';

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
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'The API key for your ONLYOFFICE DocSpace portal',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
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
					message: 'Invalid API key',
				},
			},
		],
	};
}
