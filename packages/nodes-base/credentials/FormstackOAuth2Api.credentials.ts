import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes: string[] = [];

export class FormstackOAuth2Api implements ICredentialType {
	name = 'formstackOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Formstack OAuth2 API';
	documentationUrl = 'formstack';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://www.formstack.com/api/v2/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://www.formstack.com/api/v2/oauth2/token',
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
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'header',
		},
	];
}
