import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StrapiTokenApi implements ICredentialType {
	name = 'strapiTokenApi';

	displayName = 'Strapi API Token';

	documentationUrl = 'strapi';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://api.example.com',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			default: 'v3',
			type: 'options',
			description: 'The version of api to be used',
			options: [
				{
					name: 'Version 4',
					value: 'v4',
					description: 'API version supported by Strapi 4',
				},
				{
					name: 'Version 3',
					value: 'v3',
					description: 'API version supported by Strapi 3',
				},
			],
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
			baseURL: '={{$credentials.url}}',
			url: '={{$credentials.apiVersion === "v3" ? "/users/count" : "/api/users/count"}}',
			ignoreHttpStatusErrors: true,
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'error.name',
					value: 'UnauthorizedError',
					message: 'Invalid API token',
				},
			},
		],
	};
}
