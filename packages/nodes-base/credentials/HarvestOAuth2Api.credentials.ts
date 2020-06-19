import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class HarvestOAuth2Api implements ICredentialType {
	name = 'harvestOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Harvest OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://SUBDOMAIN_HERE.harvestapp.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://SUBDOMAIN_HERE.harvestapp.com/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string' as NodePropertyTypes,
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
