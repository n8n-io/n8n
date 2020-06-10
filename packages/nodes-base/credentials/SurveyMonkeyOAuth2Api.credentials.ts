import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class SurveyMonkeyOAuth2Api implements ICredentialType {
	name = 'surveyMonkeyOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'SurveyMonkey OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.surveymonkey.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.surveymonkey.com/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string' as NodePropertyTypes,
			default: 'surveys_read,surveys_write,responses_read,responses_write,webhooks_read,webhooks_write',
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
			default: 'body'
		},
	];
}
