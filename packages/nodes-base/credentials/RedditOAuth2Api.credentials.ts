import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'identity',
	'edit',
	'flair',
	'history',
	'modconfig',
	'modflair',
	'modlog',
	'modposts',
	'modwiki',
	'mysubreddits',
	'privatemessages',
	'read',
	'report',
	'save',
	'submit',
	'subscribe',
	'vote',
	'wikiedit',
	'wikiread',
];

// https://github.com/reddit-archive/reddit/wiki/OAuth2

export class RedditOAuth2Api implements ICredentialType {
	name = 'redditOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Reddit OAuth2 API';
	documentationUrl = 'reddit';
	properties = [
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: 'response_type=code',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: 'duration=permanent',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://www.reddit.com/api/v1/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://www.reddit.com/api/v1/access_token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'header',
		},
	];
}
