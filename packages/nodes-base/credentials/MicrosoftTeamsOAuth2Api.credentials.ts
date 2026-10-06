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
	'ChannelMessage.ReadWrite',
	'TeamworkTag.Read',
	'TeamsActivity.Send',
	// The Microsoft Teams Trigger "New Team Member" event subscribes to /teams/{id}/members.
	// A tenant admin must consent to this delegated permission.
	'TeamMember.Read.All',
];

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
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
		},
		{
			displayName: `
      Microsoft Teams Trigger uses these permissions, all included in the default scopes:
      <br>New Channel Message: <code>ChannelMessage.Read.All</code>
      <br>New Chat, New Chat Message: <code>Chat.ReadWrite</code>
      <br>New Channel: <code>Group.ReadWrite.All</code>
      <br>New Team Member: <code>TeamMember.Read.All</code>
      <br>Team and channel lists: <code>User.Read.All</code>, <code>Group.ReadWrite.All</code>
      <br>All except <code>Chat.ReadWrite</code> need tenant admin consent.
    `,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
