import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes: { [key: string]: string[] } = {
	"Read & Write": [
		'https://www.googleapis.com/auth/calendar',
		'https://www.googleapis.com/auth/calendar.events',
	],
	"Read Only": [
		'https://www.googleapis.com/auth/calendar.readonly',
		'https://www.googleapis.com/auth/calendar.events.readonly',
	],
};

export class GoogleCalendarOAuth2Api implements ICredentialType {
	name = 'googleCalendarOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Calendar OAuth2 API';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'options',
			options: Object.entries(scopes).map(x => ({name: x[0], value: x[1].join(' ')})),
			default: 'Read & Write',
		},
	];
}
