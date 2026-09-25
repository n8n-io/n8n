import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AtlassianOAuth2Api implements ICredentialType {
	name = 'atlassianOAuth2Api';

	extends = ['oAuth2Api'];

	icon: Icon = 'file:icons/Atlassian.svg';

	displayName = 'Atlassian OAuth2 API';

	documentationUrl = 'atlassian';

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
			default: 'https://auth.atlassian.com/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.atlassian.com/oauth/token',
			required: true,
		},
		{
			// `prompt=consent` forces the Atlassian consent screen (which shows the
			// active account and offers a switch) instead of a silent re-auth.
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'audience=api.atlassian.com&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		// The `scope` field inherited from `oAuth2Api` stays visible and user-defined;
		// product credentials override it with their own defaults.
	];
}
