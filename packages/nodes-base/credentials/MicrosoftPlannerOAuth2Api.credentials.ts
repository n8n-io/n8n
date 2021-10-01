import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MicrosoftPlannerOAuth2Api implements ICredentialType {
	name = 'microsoftPlannerOAuth2Api';
	extends = [
		'microsoftOAuth2Api',
	];
	displayName = 'Microsoft Planner OAuth2 API';
	documentationUrl = 'microsoft';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid offline_access Mail.ReadWrite Mail.ReadWrite.Shared Mail.Send Mail.Send.Shared MailboxSettings.Read',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://acuityscheduling.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://acuityscheduling.com/oauth2/token',
			required: true,
		},
	];
}
