import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CiscoWebexOAuth2Api implements ICredentialType {
	name = 'ciscoWebexOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Cisco Webex OAuth2 API';

	documentationUrl = 'ciscowebex';

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
			default: 'https://webexapis.com/v1/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://webexapis.com/v1/access_token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'spark:memberships_read meeting:recordings_read spark:kms meeting:schedules_read spark:rooms_read spark:messages_write spark:memberships_write meeting:recordings_write meeting:preferences_read spark:messages_read meeting:schedules_write',
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
