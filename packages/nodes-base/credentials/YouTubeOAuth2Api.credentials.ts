import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

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

	icon: Icon = 'node:n8n-nodes-base.youTube';

	extends = ['googleOAuth2Api'];

	displayName = 'YouTube OAuth2 API';

	documentationUrl = 'google';

	properties: INodeProperties[] = [
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set, If you change these the node may not function correctly.',
			name: 'customScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
		},
		{
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: scopes.join(' '),
			description: 'Scopes that should be enabled',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '={{$self["customScopes"] ? $self["enabledScopes"] : "' + scopes.join(' ') + '"}}',
		},
	];
}
