import type { ICredentialType, INodeProperties } from 'n8n-workflow';

//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
const defaultScopes = ['openid', 'offline_access', 'Files.ReadWrite'];

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
