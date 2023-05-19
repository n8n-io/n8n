import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/bigquery',
	'https://www.googleapis.com/auth/cloud-platform',
	'https://www.googleapis.com/auth/drive',
];

export class GoogleBigQueryOAuth2Api implements ICredentialType {
	name = 'googleBigQueryOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google BigQuery OAuth2 API';

	documentationUrl = 'google/oauth-single-service';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
