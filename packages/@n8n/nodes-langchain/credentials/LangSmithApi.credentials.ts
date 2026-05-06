import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const DEFAULT_API_URL = 'https://api.smith.langchain.com';

export class LangSmithApi implements ICredentialType {
	name = 'langSmithApi';

	displayName = 'LangSmith API';

	documentationUrl = 'https://docs.smith.langchain.com/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: process.env.LANGCHAIN_ENDPOINT || DEFAULT_API_URL,
			url: '/api/v1/info',
			method: 'GET',
		},
	};
}
