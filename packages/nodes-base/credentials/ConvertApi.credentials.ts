import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ConvertApi implements ICredentialType {
	name = 'convertApi';

	displayName = 'ConvertAPI';

	documentationUrl = 'convertapi';

	icon: Icon = 'file:icons/ConvertApi.png';

	httpRequestNode = {
		name: 'ConvertAPI',
		docsUrl: 'https://docs.convertapi.com/docs/getting-started',
		apiBaseUrl: 'https://v2.convertapi.com/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://v2.convertapi.com',
			url: '/convert/docx/to/pdf',
			ignoreHttpStatusErrors: true,
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'Code',
					value: 4013,
					message: 'API Token or Secret is invalid.',
				},
			},
		],
	};
}
