import {
	CredentialSchema,
	type ICredentialType,
	type IAuthenticateGeneric,
	type ICredentialTestRequest,
} from 'n8n-workflow';

export class StrapiTokenApi implements ICredentialType {
	name = 'strapiTokenApi';

	displayName = 'Strapi API Token';

	documentationUrl = 'strapi';

	schema = CredentialSchema.create({
		apiToken: CredentialSchema.password({ label: 'API Token' }),
		url: CredentialSchema.url({ placeholder: 'https://api.example.com' }),
		apiVersion: CredentialSchema.options({
			label: 'API Version',
			description: 'The version of api to be used',
			options: [
				{
					label: 'Version 4',
					value: 'v4',
					description: 'API version supported by Strapi 4',
				},
				{
					label: 'Version 3',
					value: 'v3',
					default: true,
					description: 'API version supported by Strapi 3',
				},
			],
		}),
	});

	properties = this.schema.toNodeProperties();

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
