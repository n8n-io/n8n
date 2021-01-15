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
			type: 'hidden' as NodePropertyTypes,
			default: 'https://id.getharvest.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://id.getharvest.com/api/v2/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'all',
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
