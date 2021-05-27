import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/books',
];

export class GoogleBooksOAuth2Api implements ICredentialType {
	name = 'googleBooksOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Books OAuth2 API';
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
