import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ScrapegraphAIApi implements ICredentialType {
	name = 'scrapegraphAIApi';
	displayName = 'ScrapegraphAI API';
	documentationUrl = 'https://scrapegraphai.com/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'SGAI-APIKEY': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.scrapegraphai.com/v1',
			url: '/markdownify',
			method: 'POST',
			body: {
				website_url: 'https://example.com',
			},
		},
	};
} 