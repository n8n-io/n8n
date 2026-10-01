import type { ICredentialType, INodeProperties } from 'n8n-workflow';

//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
const defaultScopes = [
	'openid',
	'offline_access',
	'Contacts.Read',
	'Contacts.ReadWrite',
	'Calendars.Read',
	'Calendars.Read.Shared',
	'Calendars.ReadWrite',
	'Mail.ReadWrite',
	'Mail.ReadWrite.Shared',
	'Mail.Send',
	'Mail.Send.Shared',
	'MailboxSettings.Read',
];

export class MicrosoftOutlookOAuth2Api implements ICredentialType {
	name = 'microsoftOutlookOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Outlook OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set. If you change these the node may not function correctly.',
			name: 'customScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
		},
		{
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: defaultScopes.join(' '),
			description: 'Scopes that should be enabled',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
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
			description: "Target user's UPN or ID",
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					useShared: [true],
				},
			},
		},
	];
}
