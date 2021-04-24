import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/bigquery',
];

export class GoogleBigQueryOAuth2Api implements ICredentialType {
	name = 'googleBigQueryOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google BigQuery OAuth2 API';
	documentationUrl = 'google';
	properties = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
		},
	];
}
