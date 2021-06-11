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
			placeholder: 'https://<instance>.service-now.com',
			required: true,
			default: '',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string' as NodePropertyTypes,
			placeholder: `https://<instance>.servicenow.com/oauth_auth.do`,
			required: true,
			default: '',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string' as NodePropertyTypes,
			placeholder: 'https://<instance>.service-now.com/oauth_token.do',
			required: true,
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: 'grant_type=password',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
