import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/tasks',
];

export class GoogleTasksOAuth2Api implements ICredentialType {
	name = 'googleTasksOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Tasks OAuth2 API';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
