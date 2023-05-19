import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AirtableApi implements ICredentialType {
	name = 'airtableApi';

	displayName = 'Airtable API';

	documentationUrl = 'airtable';

	properties: INodeProperties[] = [
		{
			displayName:
				'API Keys will be deprecated by the end of January 2024, see <a href="https://support.airtable.com/docs/airtable-api-key-deprecation-notice" target="_blank">this article</a> for more details. We recommend to use Personal Access Token instead.',
			name: 'deprecated',
			type: 'notice',
			default: '',
		},
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
				api_key: '={{$credentials.apiKey}}',
			},
		},
	};
}
