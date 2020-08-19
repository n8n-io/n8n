import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

//https://developers.google.com/youtube/v3/guides/auth/client-side-web-apps#identify-access-scopes
const scopes = [
	'https://www.googleapis.com/auth/youtube',
	'https://www.googleapis.com/auth/youtubepartner',
	'https://www.googleapis.com/auth/youtube.force-ssl',
	'https://www.googleapis.com/auth/youtube.upload',
	'https://www.googleapis.com/auth/youtubepartner-channel-audit',
];

export class YouTubeOAuth2Api implements ICredentialType {
	name = 'youTubeOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google OAuth2 API';
	documentationUrl = 'google';
	properties = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
		},
	];
}
