import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftAzureMonitorOAuth2Api implements ICredentialType {
	name = 'microsoftAzureMonitorOAuth2Api';

	displayName = 'Microsoft Azure Monitor OAuth2 API';

	extends = ['oAuth2Api'];

	documentationUrl = 'microsoftazuremonitor';

	icon: Icon = 'file:icons/Microsoft.svg';

	httpRequestNode = {
		name: 'Microsoft Azure Monitor',
		docsUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/logs/api/request-format',
		apiBaseUrlPlaceholder: 'https://api.loganalytics.azure.com/v1/workspaces/[workspace_id]/query',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'options',
			options: [
				{
					name: 'Authorization Code',
					value: 'authorizationCode',
				},
				{
					name: 'Client Credentials',
					value: 'clientCredentials',
				},
			],
			default: 'authorizationCode',
		},
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
			default:
				'=https://login.microsoftonline.com/{{$self["tenantId"]}}/oauth2/{{$self["grantType"] === "clientCredentials" ? "v2.0/" : ""}}token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default:
				'={{$self["grantType"] === "clientCredentials" ? "" : "resource=" + $self["resource"]}}',
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set, If you change these the node may not function correctly. Use the <code>{resource}</code> placeholder to reference the Resource value above. With the Authorization Code grant, the default scope is empty — the resource travels as a query parameter instead.',
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
			default: '{resource}/.default',
			description:
				'Scopes that should be enabled. Use <code>{resource}</code> as a placeholder that will be replaced with the Resource value.',
		},
		{
			// The untouched prefill counts as "use the defaults" so toggling custom
			// scopes on without edits stays a no-op under the Authorization Code
			// grant too, where the default scope is deliberately empty
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{(($self["customScopes"] && $self["enabledScopes"] && $self["enabledScopes"] !== "{resource}/.default") ? $self["enabledScopes"] : ($self["grantType"] === "clientCredentials" ? "{resource}/.default" : "")).replace(/\\{resource\\}/g, $self["resource"])}}',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
