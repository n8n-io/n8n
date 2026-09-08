import type { ICredentialType, INodeProperties } from 'n8n-workflow';

// Group.ReadWrite.All covers channel create/update/delete, channel-message send and
// Planner task writes — downgrading it to Group.Read.All breaks those operations (#35992).
const defaultScopes = [
	'openid',
	'offline_access',
	'User.Read.All',
	'Group.ReadWrite.All',
	'Chat.ReadWrite',
	'ChannelMessage.Read.All',
	'OnlineMeetings.ReadWrite',
];

const CHAT_MEMBER_REMOVE_SCOPE = 'ChatMember.ReadWrite';

export class MicrosoftTeamsOAuth2Api implements ICredentialType {
	name = 'microsoftTeamsOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Teams OAuth2 API';

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
			// A plain boolean rather than a Custom Scopes instruction: on Cloud, managed OAuth
			// hides the scope fields, and this stays visible there. The scope needs tenant admin
			// consent, so it is never in the defaults.
			displayName: 'Include Chat Member Scope',
			name: 'includeChatMemberScope',
			type: 'boolean',
			default: false,
			description:
				'Grants the ChatMember.ReadWrite scope, needed to remove chat members. It requires tenant admin consent. Reconnect the credential after changing this.',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{($self["customScopes"] ? $self["enabledScopes"] : "' +
				defaultScopes.join(' ') +
				'") + ($self["includeChatMemberScope"] && !($self["customScopes"] ? $self["enabledScopes"] : "").split(" ").includes("' +
				CHAT_MEMBER_REMOVE_SCOPE +
				'") ? " ' +
				CHAT_MEMBER_REMOVE_SCOPE +
				'" : "")}}',
		},
		{
			displayName: `
      Microsoft Teams Trigger requires the following permissions:
      <br><code>ChannelMessage.Read.All</code>
      <br><code>Chat.Read.All</code>
      <br><code>Team.ReadBasic.All</code>
      <br><code>Subscription.Read.All</code>
      <br>Configure these permissions in <a href="https://portal.azure.com">Microsoft Entra</a>
    `,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
