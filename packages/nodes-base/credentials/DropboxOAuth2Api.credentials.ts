import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['account_info.write', 'account_info.read', 'files.metadata.write', 'files.metadata.read', 'files.content.write', 'files.content.read', 'sharing.write', 'sharing.read', 'file_requests.write', 'file_requests.read', 'contacts.write', 'contacts.read', 'profile', 'openid', 'email', 'team_info.write', 'team_info.read', 'team_data.member', 'team_data.team_space', 'team_data.governance.write', 'team_data.governance.read', 'team_data.content.write', 'team_data.content.read', 'files.team_metadata.write', 'files.team_metadata.read', 'files.permanent_delete', 'members.write', 'members.read', 'members.delete', 'groups.write', 'groups.read', 'sessions.modify', 'sessions.list', 'events.write', 'events.read'];

export class DropboxOAuth2Api implements ICredentialType {
	name = 'dropboxOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Dropbox OAuth2 API';

	documentationUrl = 'dropbox';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://www.dropbox.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.dropboxapi.com/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'token_access_type=offline&force_reapprove=true',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'APP Access Type',
			name: 'accessType',
			type: 'options',
			options: [
				{
					name: 'App Folder',
					value: 'folder',
				},
				{
					name: 'Full Dropbox',
					value: 'full',
				},
			],
			default: 'full',
		},
	];
}
