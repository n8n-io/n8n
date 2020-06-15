import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PagerDutyOAuth2Api implements ICredentialType {
	name = 'pagerDutyOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'PagerDuty OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://app.pagerduty.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://app.pagerduty.com/oauth/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden' as NodePropertyTypes,
            default: 'header',
            description: 'Method of authentication.',
        },
	];
}
