import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const defaultScopes = 'activity:read_all,activity:write';

export class StravaOAuth2Api implements ICredentialType {
	name = 'stravaOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Strava OAuth2 API';

	documentationUrl = 'strava';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://www.strava.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://www.strava.com/oauth/token',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Whether to define custom OAuth2 scopes instead of the defaults',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set. If you change these the node may not function correctly.',
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
			default: defaultScopes,
			description: 'Comma-separated list of Strava OAuth2 scopes to request',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: `={{$self["customScopes"] ? $self["enabledScopes"] : "${defaultScopes}"}}`,
			required: true,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
