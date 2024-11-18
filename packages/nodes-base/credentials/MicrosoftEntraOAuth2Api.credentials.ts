import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftEntraOAuth2Api implements ICredentialType {
	name = 'microsoftEntraOAuth2Api';

	displayName = 'Microsoft Entra ID (Azure Active Directory) API';

	extends = ['microsoftOAuth2Api'];

	documentationUrl = 'microsoftentra';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			// To update user specific properties add Sites.FullControl.All: https://github.com/microsoftgraph/msgraph-sdk-dotnet/issues/1316
			default:
				'openid offline_access AccessReview.ReadWrite.All Directory.ReadWrite.All NetworkAccessPolicy.ReadWrite.All DelegatedAdminRelationship.ReadWrite.All EntitlementManagement.ReadWrite.All User.ReadWrite.All Directory.AccessAsUser.All Sites.FullControl.All GroupMember.ReadWrite.All',
		},
	];
}
