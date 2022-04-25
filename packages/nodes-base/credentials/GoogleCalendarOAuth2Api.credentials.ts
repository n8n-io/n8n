import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/calendar',
	'https://www.googleapis.com/auth/calendar.events',
];

export class GoogleCalendarOAuth2Api implements ICredentialType {
	name = 'googleCalendarOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Calendar OAuth2 API';
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
