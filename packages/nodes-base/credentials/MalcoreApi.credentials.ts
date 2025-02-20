import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MalcoreApi implements ICredentialType {
	name = 'malcoreApi';

	displayName = 'MalcoreAPI';

	documentationUrl = 'malcore';

	icon = { light: 'file:icons/Malcore.png', dark: 'file:icons/Malcore.png' } as const;

	httpRequestNode = {
		name: 'Malcore',
		docsUrl: 'https://malcore.readme.io/reference/upload',
		apiBaseUrlPlaceholder: 'https://api.malcore.io/api/urlcheck',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				apiKey: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.malcore.io/api',
			url: '/urlcheck',
			method: 'POST',
			body: { url: 'google.com' },
		},
	};
}
