import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AirtablePersonalAccessTokenApi implements ICredentialType {
	name = 'airtablePersonalAccessTokenApi';

	displayName = 'Airtable API - Personal Access Token';

	documentationUrl = 'airtable';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'personalAccessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.personalAccessToken}}',
			},
		},
	};
}
