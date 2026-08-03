import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

const defaultScopes = ['openid', 'offline_access', 'https://{subdomain}.sharepoint.com/.default'];

export class MicrosoftSharePointOAuth2Api implements ICredentialType {
	name = 'microsoftSharePointOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	icon: Icon = {
		light: 'file:icons/microsoftSharePoint.svg',
		dark: 'file:icons/microsoftSharePoint.svg',
	};

	displayName = 'Microsoft SharePoint OAuth2 API';

	documentationUrl = 'microsoft';

	httpRequestNode = {
		name: 'Microsoft SharePoint',
		docsUrl: 'https://learn.microsoft.com/en-us/sharepoint/dev/apis/sharepoint-rest-graph',
		apiBaseUrlPlaceholder: 'https://{subdomain}.sharepoint.com/_api/v2.0/',
	};

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
				'The default scopes needed for the node to work are already set, If you change these the node may not function correctly. Use the <code>{subdomain}</code> placeholder to reference the Subdomain value below.',
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
			description:
				'Scopes that should be enabled. Use <code>{subdomain}</code> as a placeholder that will be replaced with the Subdomain value.',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{($self["customScopes"] ? $self["enabledScopes"] : "' +
				defaultScopes.join(' ') +
				'").replace(/\\{subdomain\\}/g, $self["subdomain"])}}',
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			hint: 'You can extract the subdomain from the URL. For example, in the URL "https://tenant123.sharepoint.com", the subdomain is "tenant123".',
		},
		{
			displayName: 'Microsoft Graph API Base URL',
			name: 'graphApiBaseUrl',
			type: 'hidden',
			default: 'https://graph.microsoft.com',
		},
	];
}
