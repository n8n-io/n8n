import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ServiceNowOAuth2Api implements ICredentialType {
	name = 'serviceNowOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Service Now OAuth2 API';
	documentationUrl = 'serviceNow';
	properties = [
		{
			displayName: 'Instance domain',
			name: 'instanceDomain',
			type: 'string' as NodePropertyTypes,
			default: 'https://<instance>.service-now.com',
			required: true,
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string' as NodePropertyTypes,
			default: `https://<instance>.servicenow.com/oauth_auth.do`,
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://<instance>.service-now.com/oauth_token.do',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'useraccount',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: 'response_type=code',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: 'grant_type=authorization_code',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'header',
		},
	];
}
