import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class SentryioOAuth2Api implements ICredentialType {
	name = 'sentryioOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Sentry.io OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://sentry.io/oauth/authorize/',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://sentry.io/oauth/token/',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'org:read,org:write,org:admin,project:read,project:write,project:admin,team:read,team:write,team:admin,event:read,event:write,event:admin',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
