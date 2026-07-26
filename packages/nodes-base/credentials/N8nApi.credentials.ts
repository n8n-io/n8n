import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class N8nApi implements ICredentialType {
	name = 'n8nApi';

	displayName = 'n8n API';

	documentationUrl = 'https://docs.n8n.io/api/authentication/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'The API key for the n8n instance',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://<name>.app.n8n.cloud/api/v1',
			description:
				'The API URL of the n8n instance. Must end with /api/v1 (e.g. https://your-n8n-instance.com/api/v1)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-N8N-API-KEY': '={{ $credentials.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{ ((($credentials.baseUrl || "").trim().replace(/\/+$/, "")).endsWith("/api/v1")) ? (($credentials.baseUrl || "").trim().replace(/\/+$/, "")) : "" }}',
			url: '/workflows?limit=5',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'data',
					value: [],
					message: 'Invalid Base URL. Please make sure it ends with /api/v1',
				},
			},
		],
	};
}
