import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'surveys_read',
	'collectors_read',
	'responses_read',
	'responses_read_detail',
	'webhooks_write',
	'webhooks_read',
];

export class SurveyMonkeyOAuth2Api implements ICredentialType {
	name = 'surveyMonkeyOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'SurveyMonkey OAuth2 API';
	documentationUrl = 'surveyMonkey';
	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://api.surveymonkey.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.surveymonkey.com/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(','),
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
