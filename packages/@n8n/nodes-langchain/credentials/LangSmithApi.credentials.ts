import type {
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
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: DEFAULT_API_URL,
			description: 'The LangSmith API URL. Change this for self-hosted instances.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl || "' + DEFAULT_API_URL + '"}}',
			url: '/api/v1/info',
			method: 'GET',
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};
}
