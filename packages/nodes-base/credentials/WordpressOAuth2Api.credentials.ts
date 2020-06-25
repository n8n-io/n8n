import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class WordpressOAuth2Api implements ICredentialType {
	name = 'wordpressOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Wordpress OAuth2 API';
	properties = [
		{
			displayName: 'Wordpress URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://public-api.wordpress.com/',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://public-api.wordpress.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://public-api.wordpress.com/oauth2/token',
			required: true,
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
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body'
		},
	];
}
