import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ServiceNowOAuth2Api implements ICredentialType {
	name = 'serviceNowOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'ServiceNow OAuth2 API';
	documentationUrl = 'serviceNow';
	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			placeholder: 'n8n',
			description: 'The subdomain of your ServiceNow environment',
			required: true,
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://{{$self["subdomain"]}}.service-now.com/oauth_auth.do',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://{{$self["subdomain"]}}.service-now.com/oauth_token.do',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'useraccount',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'response_type=code',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'grant_type=authorization_code',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
