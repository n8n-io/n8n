import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/contacts',
];

export class GoogleContactsOAuth2Api implements ICredentialType {
	name = 'googleContactsOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Contacts OAuth2 API';
	properties = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
		},
	];
}
