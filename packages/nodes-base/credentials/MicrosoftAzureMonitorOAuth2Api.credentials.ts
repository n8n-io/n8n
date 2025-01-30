import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftAzureMonitorOAuth2Api implements ICredentialType {
	name = 'microsoftAzureMonitorOAuth2Api';

	displayName = 'Microsoft Azure Monitor OAuth2 API';

	extends = ['microsoftOAuth2Api'];

	documentationUrl = 'microsoftazuremonitor';

	icon: Icon = 'file:icons/Microsoft.svg';

	httpRequestNode = {
		name: 'Microsoft Azure Monitor',
		docsUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/logs/api/request-format',
		apiBaseUrlPlaceholder: 'https://api.loganalytics.azure.com/v1/workspaces/[workspace_id]/query',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Tenant ID',
			required: true,
			name: 'tenantId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
				{
					name: 'Azure Log Analytics',
					value: 'https://api.loganalytics.azure.com',
				},
				{
					name: 'Log Analytics',
					value: 'https://api.loganalytics.io',
				},
				{
					name: 'Azure Monitor',
					value: 'https://monitor.azure.com',
				},
				{
					name: 'Azure Management',
					value: 'https://management.azure.com',
				},
			],
			default: 'https://api.loganalytics.azure.com',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://login.microsoftonline.com/{{$self["tenantId"]}}/oauth2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://login.microsoftonline.com/{{$self["tenantId"]}}/oauth2/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '=resource={{$self["resource"]}}',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
	];
}
