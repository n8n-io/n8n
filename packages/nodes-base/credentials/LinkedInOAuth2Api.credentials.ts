import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class LinkedInOAuth2Api implements ICredentialType {
	name = 'linkedInOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'LinkedIn OAuth2 API';

	documentationUrl = 'linkedIn';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Organization Support',
			name: 'organizationSupport',
			type: 'boolean',
			default: true,
			description: 'Whether to request permissions to post as an organization',
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
			default:
				'=r_liteprofile,r_emailaddress,w_member_social{{$self["organizationSupport"] === true ? ",w_organization_social":""}}',
			description:
				'Standard scopes for posting on behalf of a user or organization. See <a href="https://docs.microsoft.com/en-us/linkedin/marketing/getting-started#available-permissions"> this resource </a>.',
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
