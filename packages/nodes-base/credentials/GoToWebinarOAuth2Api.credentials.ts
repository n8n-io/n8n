import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

// TODO
const scopes = [
	'Profile',
	'GoToMeeting, GoToWebinar, or GoToTraining',
];

// https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization

export class GoToWebinarOAuth2Api implements ICredentialType {
	name = 'goToWebinarOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Go To Webinar OAuth2 API';
	documentationUrl = 'goToWebinar';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.getgo.com/oauth/v2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.getgo.com/oauth/v2/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join('|'),
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
			default: 'header',
		},
	];
}
