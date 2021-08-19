import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class CiscoWebexOAuth2Api implements ICredentialType {
	name = 'ciscoWebexOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Cisco Webex OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://webexapis.com/v1/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://webexapis.com/v1/access_token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'spark:memberships_read meeting:recordings_read spark:kms meeting:schedules_read spark:rooms_read spark:messages_write spark:memberships_write meeting:recordings_write meeting:preferences_read spark:messages_read meeting:schedules_write',
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
