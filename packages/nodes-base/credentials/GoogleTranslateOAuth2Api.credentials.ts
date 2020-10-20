import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/cloud-translation',
	'https://www.googleapis.com/auth/cloud-platform',
];

export class GoogleTranslateOAuth2Api implements ICredentialType {
	name = 'googleTranslateOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Translate OAuth2 API';
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
