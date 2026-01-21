import type { ICredentialType, INodeProperties } from 'n8n-workflow';

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

export class MicrosoftOneDriveOAuth2Api implements ICredentialType {
	name = 'microsoftOneDriveOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Drive OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid offline_access Files.ReadWrite.All',
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
