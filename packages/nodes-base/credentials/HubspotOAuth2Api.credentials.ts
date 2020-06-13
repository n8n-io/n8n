import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'contacts',
	'forms',
	'tickets',
];

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
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
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
            default: 'body',
            description: 'Resource to consume.',
        },
	];
}
