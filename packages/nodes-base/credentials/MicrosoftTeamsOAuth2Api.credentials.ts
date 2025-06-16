import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftTeamsOAuth2Api implements ICredentialType {
	name = 'microsoftTeamsOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Teams OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid offline_access User.ReadWrite.All Group.ReadWrite.All Chat.ReadWrite',
		},
		{
			displayName: `
      Microsoft Teams Trigger requires the following permissions:
      <br><code>ChannelMessage.Read.All</code>
      <br><code>Chat.Read.All</code>
      <br><code>Team.ReadBasic.All</code>
      <br><code>Subscription.ReadWrite.All</code>
      <br>Configure these permissions in <a href="https://portal.azure.com">Microsoft Entra</a>
    `,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
