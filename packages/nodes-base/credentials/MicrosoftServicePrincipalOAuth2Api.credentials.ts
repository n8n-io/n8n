import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftServicePrincipalOAuth2Api implements ICredentialType {
	name = 'microsoftServicePrincipalOAuth2Api';

	extends = ['oAuth2Api'];

	icon: Icon = 'file:icons/Microsoft.svg';

	displayName = 'Microsoft Service Principal OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'clientCredentials',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			required: true,
			default: '',
			description:
				'The Azure tenant (directory) ID of your Azure AD application. Found in the Azure portal under App registrations → your app → Overview.',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://login.microsoftonline.com/{{$self["tenantId"]}}/oauth2/v2.0/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://login.microsoftonline.com/{{$self["tenantId"]}}/oauth2/v2.0/token',
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
		{
			displayName: 'Send Additional Body Properties',
			name: 'sendAdditionalBodyProperties',
			type: 'hidden',
			default: false,
		},
		{
			displayName: 'Microsoft Graph API Base URL',
			name: 'graphApiBaseUrl',
			type: 'options',
			options: [
				{ name: 'Global (https://graph.microsoft.com)', value: 'https://graph.microsoft.com' },
				{
					name: 'US Government (https://graph.microsoft.us)',
					value: 'https://graph.microsoft.us',
				},
				{
					name: 'US Government DOD (https://dod-graph.microsoft.us)',
					value: 'https://dod-graph.microsoft.us',
				},
				{
					name: 'China (https://microsoftgraph.chinacloudapi.cn)',
					value: 'https://microsoftgraph.chinacloudapi.cn',
				},
			],
			default: 'https://graph.microsoft.com',
			description: 'Select the endpoint for your Microsoft cloud environment.',
		},
	];
}
