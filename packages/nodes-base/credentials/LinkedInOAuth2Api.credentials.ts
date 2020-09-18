import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class LinkedInOAuth2Api implements ICredentialType {
	name = 'linkedInOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'LinkedIn OAuth2 API';
	properties = [
		{
			displayName: 'Organization Support',
			name: 'organizationSupport',
			type: 'boolean' as NodePropertyTypes,
			default: true,
			description: 'Request permissions to post as an orgaization.',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://www.linkedin.com/oauth/v2/authorization',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://www.linkedin.com/oauth/v2/accessToken',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: '=r_liteprofile,r_emailaddress,w_member_social{{$parameter["organizationSupport"] === true ? ",w_organization_social":""}}',
			description: 'Standard scopes for posting on behalf of a user or organization. See <a href="https://docs.microsoft.com/en-us/linkedin/marketing/getting-started#available-permissions"> this resource </a>.'
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
