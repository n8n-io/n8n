import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class LinearOAuth2Api implements ICredentialType {
	name = 'linearOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Linear OAuth2 API';

	documentationUrl = 'linear';

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
			default: 'https://linear.app/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.linear.app/oauth/token',
			required: true,
		},
		{
			displayName: 'Actor',
			name: 'actor',
			type: 'options',
			options: [
				{
					name: 'User',
					value: 'user',
					description: 'Resources are created as the user who authorized the application',
				},
				{
					name: 'Application',
					value: 'application',
					description: 'Resources are created as the application',
				},
			],
			default: 'user',
		},
		{
			displayName: 'Include Admin Scope',
			name: 'includeAdminScope',
			type: 'boolean',
			default: false,
			description: 'Grants the "Admin" scope, Needed to create webhooks',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{$self["includeAdminScope"] ? "read write issues:create comments:create admin" : "read write issues:create comments:create"}}',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '={{"actor="+$self["actor"]}}',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
