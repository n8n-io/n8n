import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ScrapflyApi implements ICredentialType {
	name = 'ScrapflyApi';
	displayName = 'ScrapflyApi API';
	documentationUrl = 'https://scrapfly.io/docs/account';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				key: '={{$credentials.apiKey}}',
			},
		},
	};
}
