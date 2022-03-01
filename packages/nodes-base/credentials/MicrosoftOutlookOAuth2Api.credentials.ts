import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MicrosoftOutlookOAuth2Api implements ICredentialType {
	name = 'microsoftOutlookOAuth2Api';
	extends = [
		'microsoftOAuth2Api',
	];
	displayName = 'Microsoft Outlook OAuth2 API';
	documentationUrl = 'microsoft';
	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid offline_access Mail.ReadWrite Mail.ReadWrite.Shared Mail.Send Mail.Send.Shared MailboxSettings.Read',
		},
		{
			displayName: 'Use Shared Mailbox',
			name: 'useShared',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'User Principal Name',
			name: 'userPrincipalName',
			description: 'Target user\'s UPN or ID',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					useShared: [
						true,
					],
				},
			},
		},
	];
}
