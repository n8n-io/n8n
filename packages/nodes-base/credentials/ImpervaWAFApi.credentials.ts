import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ImpervaWAFApi implements ICredentialType {
	name = 'impervaWAFApi';

	displayName = 'Imperva WAF API';

	properties: INodeProperties[] = [
		{
			displayName: 'API ID',
			name: 'apiID',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'baseUrl',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-API-Id': '={{$credentials.apiID}}',
				'x-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};
}
