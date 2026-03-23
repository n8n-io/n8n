import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class WordpressOAuth2Api implements ICredentialType {
	name = 'wordpressOAuth2Api';

	displayName = 'WordPress OAuth2 API';

	extends = ['oAuth2Api'];

	documentationUrl = 'wordpress';

	properties: INodeProperties[] = [
		{
			displayName:
				'OAuth2 authentication works with WordPress.com-hosted sites only. For self-hosted WordPress, use the WordPress API (Basic Auth) credential instead.',
			name: 'wordpressComNotice',
			type: 'notice',
			default: '',
		},
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
			default: 'https://public-api.wordpress.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://public-api.wordpress.com/oauth2/token',
			required: true,
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
			default: 'header',
		},
		{
			displayName: 'WordPress.com Site',
			name: 'wordpressSite',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'myblog.wordpress.com',
			description:
				'Your WordPress.com site identifier — either a .wordpress.com subdomain (e.g. myblog.wordpress.com) or a custom domain (e.g. myblog.com). Used in API requests that still route through public-api.wordpress.com.',
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
			default: 'global',
			description: 'Space-separated list of OAuth2 scopes to request',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '={{$self["customScopes"] ? $self["enabledScopes"] : "global"}}',
		},
	];
}
