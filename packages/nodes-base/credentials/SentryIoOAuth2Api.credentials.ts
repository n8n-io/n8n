import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SentryIoOAuth2Api implements ICredentialType {
	name = 'sentryIoOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Sentry.io OAuth2 API';
	documentationUrl = 'sentryIo';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://sentry.io/oauth/authorize/',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://sentry.io/oauth/token/',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'event:admin event:read org:read project:read project:releases team:read event:write org:admin project:write team:write project:admin team:admin',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
