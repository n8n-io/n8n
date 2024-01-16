import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FacebookLeadAdsOAuth2Api implements ICredentialType {
	name = 'facebookLeadAdsOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Facebook Lead Ads OAuth2 API';

	documentationUrl = 'facebookleadads';

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
			default: 'https://www.facebook.com/v17.0/dialog/oauth',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://graph.facebook.com/v17.0/oauth/access_token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'leads_retrieval pages_show_list pages_manage_metadata pages_manage_ads business_management',
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
	];
}
