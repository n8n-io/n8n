import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HyperbrowserApi implements ICredentialType {
	name = 'hyperbrowserApi';
	displayName = 'Hyperbrowser API';
	documentationUrl = 'https://docs.hyperbrowser.ai/';

	icon = 'file:icons/hyperbrowser.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
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
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.hyperbrowser.ai/api',
			url: '/scrape',
			method: 'POST',
			body: {
				url: 'https://example.com',
				scrapeOptions: {
					formats: ['markdown'],
				},
			},
		},
	};
}
