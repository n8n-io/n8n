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
      Microsoft Teams Trigger runs on the default scopes. Per event:
      <br>New Channel Message: <code>ChannelMessage.Read.All</code>
      <br>New Chat, New Chat Message: <code>Chat.ReadWrite</code>
      <br>New Team Member: <code>TeamMember.Read.All</code>
      <br>New Channel, team and channel lists: covered by <code>Group.ReadWrite.All</code> and <code>User.Read.All</code>. With Custom Scopes, <code>Channel.ReadBasic.All</code> and <code>Team.ReadBasic.All</code> are the least privileged alternatives.
      <br>Admin consent is needed for <code>ChannelMessage.Read.All</code>, <code>TeamMember.Read.All</code>, <code>User.Read.All</code> and <code>Group.ReadWrite.All</code>, not for <code>Chat.ReadWrite</code>, <code>Channel.ReadBasic.All</code> or <code>Team.ReadBasic.All</code>.
    `,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
