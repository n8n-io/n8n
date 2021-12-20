import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PagerDutyOAuth2Api implements ICredentialType {
	name = 'pagerDutyOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'PagerDuty OAuth2 API';
	documentationUrl = 'pagerDuty';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://app.pagerduty.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://app.pagerduty.com/oauth/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'write',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
			description: 'Method of authentication.',
		},
	];
}
