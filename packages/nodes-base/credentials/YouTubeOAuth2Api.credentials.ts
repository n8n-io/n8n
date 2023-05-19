import type { ICredentialType, INodeProperties } from 'n8n-workflow';

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

	icon = 'node:n8n-nodes-base.youTube';

	extends = ['googleOAuth2Api'];

	displayName = 'YouTube OAuth2 API';

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
