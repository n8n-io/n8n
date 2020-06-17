import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/tasks',
];

export class GoogleTasksOAuth2Api implements ICredentialType {
	name = 'googleTasksOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Tasks OAuth2 API';
	properties = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' ')
		},
	];
}
