import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftOutlookServicePrincipalApi implements ICredentialType {
	name = 'microsoftOutlookServicePrincipalApi';

	extends = ['microsoftServicePrincipalOAuth2Api'];

	displayName = 'Microsoft Outlook Service Principal';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'https://graph.microsoft.com/.default',
		},
		{
			displayName: 'User Principal Name or ID',
			name: 'userPrincipalName',
			type: 'string',
			required: true,
			default: '',
			description:
				'The UPN (e.g. user@example.com) or object ID of the mailbox to access. Required because service principals cannot use the /me endpoint.',
		},
	];
}
