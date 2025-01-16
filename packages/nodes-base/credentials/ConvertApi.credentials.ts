import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ConvertApi implements ICredentialType {
	name = 'convertApi';

	displayName = 'Convert API';

	documentationUrl = 'convertapi';

	// Replace logo later
	icon = { light: 'file:icons/Auth0.svg', dark: 'file:icons/Auth0.dark.svg' } as const;

	httpRequestNode = {
		name: 'Convert API',
		docsUrl: 'https://docs.convertapi.com/docs/getting-started',
		apiBaseUrlPlaceholder: 'https://v2.convertapi.com/user',
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
			url: '/user',
		},
	};
}
