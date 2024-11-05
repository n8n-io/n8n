import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class MicrosoftEntraOAuth2Api implements ICredentialType {
	name = 'microsoftEntraOAuth2Api';

	displayName = 'Microsoft Entra ID (Azure Active Directory) API';

	extends = ['microsoftOAuth2Api'];

	icon: Icon = 'file:icons/Azure.svg';

	documentationUrl = 'microsoftentra';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'openid offline_access AccessReview.ReadWrite.All Directory.ReadWrite.All NetworkAccessPolicy.ReadWrite.All DelegatedAdminRelationship.ReadWrite.All EntitlementManagement.ReadWrite.All',
		},
	];
}
