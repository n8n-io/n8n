import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const defaultScopes = [
	'openid',
	'offline_access',
	'AccessReview.ReadWrite.All',
	'Directory.ReadWrite.All',
	'NetworkAccessPolicy.ReadWrite.All',
	'DelegatedAdminRelationship.ReadWrite.All',
	'EntitlementManagement.ReadWrite.All',
	'User.ReadWrite.All',
	'Directory.AccessAsUser.All',
	'Sites.FullControl.All',
	'GroupMember.ReadWrite.All',
];

export class MicrosoftEntraOAuth2Api implements ICredentialType {
	name = 'microsoftEntraOAuth2Api';

	displayName = 'Microsoft Entra ID (Azure Active Directory) API';

	extends = ['microsoftOAuth2Api'];

	documentationUrl = 'microsoftentra';

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
			// Sites.FullControl.All required to update user specific properties https://github.com/microsoftgraph/msgraph-sdk-dotnet/issues/1316
			default:
				'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
		},
	];
}
