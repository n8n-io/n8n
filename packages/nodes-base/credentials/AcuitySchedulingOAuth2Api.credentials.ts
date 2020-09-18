import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class AcuitySchedulingOAuth2Api implements ICredentialType {
	name = 'acuitySchedulingOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'AcuityScheduling OAuth2 API';
	documentationUrl = 'acuityScheduling';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://acuityscheduling.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://acuityscheduling.com/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'api-v1',
			required: true
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
		},
	];
}
