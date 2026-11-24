import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['app_configurations:read', 'app_configurations:write', 'managed_apps:install'];

export class SlackManagerOAuth2Api implements ICredentialType {
	name = 'slackManagerOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Slack Manager OAuth2 API';

	icon = 'file:../nodes/Slack/slack.svg' as const;

	documentationUrl = 'slack';

	hideDomainRestrictionFields = true;

	hidden = true;

	restrictToSupportedNodes = true as const;

	supportedNodes = [];

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
			default: 'https://slack.com/oauth/v2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://slack.com/api/oauth.v2.access',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: `={{"user_scope=${scopes.join(' ')}"}}`,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Allowed Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'none',
		},
	];
}
