import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/calendar',
	'https://www.googleapis.com/auth/calendar.events',
];

export class TestOAuth2Api implements ICredentialType {
	name = 'testOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Test OAuth2 API';
	properties = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'asdf',
		},
	];
}
