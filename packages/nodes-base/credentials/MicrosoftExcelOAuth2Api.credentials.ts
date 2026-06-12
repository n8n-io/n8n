import type { ICredentialType, INodeProperties } from 'n8n-workflow';

//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
// Files.ReadWrite.All grants read and write to every file the user can access,
// including shared and SharePoint document libraries (not just personal OneDrive),
// and satisfies the tenant-wide /search/query used to list workbooks. This is an
// admin-consent scope; that is acceptable for this node because it enables reading
// and writing workbooks wherever they live. Existing credentials keep working for
// OneDrive on the old token and need a one-time reconnect to reach shared/SharePoint.
const defaultScopes = ['openid', 'offline_access', 'Files.ReadWrite.All'];

export class MicrosoftExcelOAuth2Api implements ICredentialType {
	name = 'microsoftExcelOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Excel OAuth2 API';

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
				'The default scopes needed for the node to work are already set, If you change these the node may not function correctly.',
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
	];
}
