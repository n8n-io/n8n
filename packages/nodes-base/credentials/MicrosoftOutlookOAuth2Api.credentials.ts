import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
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

const enum EndpointNames {
	Global = 'Microsoft Graph global service',
	GovCloud = 'Microsoft Graph for US Government L4',
	DoDCloud = 'Microsoft Graph for US Government L5 (DOD)',
	China = 'Microsoft Graph China operated by 21Vianet',
}

/**
 * The service endpoints are defined by Microsoft:
 * https://learn.microsoft.com/en-us/graph/deployments#microsoft-graph-and-graph-explorer-service-root-endpoints
 */
const endpoints: Record<EndpointNames, string> = {
	[EndpointNames.Global]: 'https://graph.microsoft.com',
	[EndpointNames.GovCloud]: 'https://graph.microsoft.us',
	[EndpointNames.DoDCloud]: 'https://dod-graph.microsoft.us',
	[EndpointNames.China]: 'https://microsoftgraph.chinacloudapi.cn',
};

export class MicrosoftOutlookOAuth2Api implements ICredentialType {
	name = 'microsoftOutlookOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Outlook OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
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
		{
			displayName: 'Endpoint',
			description: 'The service root endpoint to use when connecting to the Outlook API.',
			name: 'graphEndpoint',
			type: 'options',
			default: endpoints[EndpointNames.Global],
			options: Object.keys(endpoints).map((name) => ({
				name,
				value: endpoints[name as EndpointNames],
			})),
		},
	];
}
