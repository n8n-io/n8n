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
            type: 'hidden' as NodePropertyTypes,
            default: 'body',
            description: 'Resource to consume.',
        },
	];
}
