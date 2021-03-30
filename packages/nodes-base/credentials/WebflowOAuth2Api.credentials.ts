import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class WebflowOAuth2Api implements ICredentialType {
	name = 'webflowOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Webflow OAuth2 API';
	documentationUrl = 'webflow';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://webflow.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.webflow.com/oauth/access_token',
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
			placeholder: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
			description: '',
		},
	];
}
