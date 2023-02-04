import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AirtableApi implements ICredentialType {
	name = 'airtableApi';

	displayName = 'Airtable API';

	documentationUrl = 'airtable';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token (or User API Key)',
			description:
				'Personal Access Tokens start with "pat" and User API keys start with "key". User API keys will stop working in early 2024.',
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
				api_key: '={{$credentials.apiKey}}',
			},
		},
	};
}
