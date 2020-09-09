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
			default: 'r_liteprofile,r_emailaddress,w_member_social,r_organization_social,w_organization_social,rw_organization_admin,rw_organization,r_ad_campaigns',
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
