import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HubspotOAuth2Api implements ICredentialType {
	name = 'hubspotOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Hubspot OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://app.hubspot.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.hubapi.com/oauth/v1/token',
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
			default: 'grant_type=authorization_code',
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
