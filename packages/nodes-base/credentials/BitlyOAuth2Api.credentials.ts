import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class BitlyOAuth2Api implements ICredentialType {
	name = 'bitlyOAuth2Api';
    displayName = 'Bitly OAuth2 API';
    
    extends = [
		'oAuth2Api',
	];
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://bitly.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api-ssl.bitly.com/oauth/access_token',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
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
			description: 'For some services additional query parameters have to be set which can be defined here.',
			placeholder: 'access_type=offline',
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
