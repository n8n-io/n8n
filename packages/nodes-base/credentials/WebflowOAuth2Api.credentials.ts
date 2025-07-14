import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class WebflowOAuth2Api implements ICredentialType {
	name = 'webflowOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Webflow OAuth2 API';

	documentationUrl = 'webflow';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Legacy',
			name: 'legacy',
			type: 'boolean',
			default: true,
			description: 'If the legacy API should be used',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://webflow.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.webflow.com/oauth/access_token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '={{$self["legacy"] ? "" : "cms:read cms:write sites:read forms:read"}}',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
			description:
				'For some services additional query parameters have to be set which can be defined here',
			placeholder: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
