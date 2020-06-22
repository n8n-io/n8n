import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class DisqusOAuth2Api implements ICredentialType {
	name = 'disqusOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Disqus OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://disqus.com/api/oauth/2.0/authorize/',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://disqus.com/api/oauth/2.0/access_token/',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string' as NodePropertyTypes,
			default: 'read,write',
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
			type: 'options' as NodePropertyTypes,
			options: [
				{
					name: 'Body',
					value: 'body',
					description: 'Send credentials in body',
				},
				{
					name: 'Header',
					value: 'header',
					description: 'Send credentials as Basic Auth header',
				},
			],
			default: 'header',
			description: 'Resource to consume.',
		},
	];
}
