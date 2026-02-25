import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GooglePalmApi implements ICredentialType {
	name = 'googlePalmApi';

	displayName = 'Google Gemini(PaLM) Api';

	documentationUrl = 'google';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string',
			default: 'https://generativelanguage.googleapis.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Add Custom Header',
			name: 'header',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Header Name',
			name: 'headerName',
			type: 'string',
			displayOptions: {
				show: {
					header: [true],
				},
			},
			default: '',
		},
		{
			displayName: 'Header Value',
			name: 'headerValue',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					header: [true],
				},
			},
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				key: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}/v1beta/models',
		},
	};
}
