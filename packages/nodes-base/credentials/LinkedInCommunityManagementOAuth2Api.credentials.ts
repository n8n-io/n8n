import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['w_member_social', 'w_organization_social', 'r_basicprofile'];

export class LinkedInCommunityManagementOAuth2Api implements ICredentialType {
	name = 'linkedInCommunityManagementOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'LinkedIn Community Management OAuth2 API';

	documentationUrl = 'linkedIn';

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
			default: 'https://www.linkedin.com/oauth/v2/authorization',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://www.linkedin.com/oauth/v2/accessToken',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
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
			default: 'body',
		},
	];
}
