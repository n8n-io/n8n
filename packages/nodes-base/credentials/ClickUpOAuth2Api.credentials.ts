import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class ClickUpOAuth2Api implements ICredentialType {
	name = 'clickUpOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'ClickUp OAuth2 API';
	properties = [
		{
			displayName: 'ClickUp Server',
			name: 'server',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.clickup.com',
			description: 'The server to connect to.',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://app.clickup.com/api',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.clickup.com/api/v2/oauth/token',
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
            default: 'body',
            description: 'Resource to consume.',
        },
	];
}
