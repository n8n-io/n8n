import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/cloud-language',
	'https://www.googleapis.com/auth/cloud-platform',
];

export class GoogleCloudNaturalLanguageOAuth2Api implements ICredentialType {
	name = 'googleCloudNaturalLanguageOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Cloud Natural Language OAuth2 API';
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
