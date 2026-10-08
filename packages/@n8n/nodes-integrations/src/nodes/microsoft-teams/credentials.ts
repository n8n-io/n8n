import { defineCredential, field } from '@n8n/node-sdk/credentials';

// `/common` works only for a multitenant app. A single-tenant app puts its tenant ID here.
const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

// Group.ReadWrite.All covers channel create/update/delete, channel-message send and Planner
// task writes (#35992).
const SCOPES = [
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
];

/**
 * Extends the legacy `microsoftOAuth2Api`, so its certificate sign-in, the instance overwrites and
 * the editor's Microsoft sign-in apply. The endpoint fields keep the legacy names, so a stored
 * tenant URL stays.
 */
export const microsoftTeamsOAuth2 = defineCredential({
	id: 'microsoftTeams.oauth2',
	version: '1.0.0',
	legacyName: 'microsoftTeamsOAuth2Api',
	legacyParent: 'microsoftOAuth2Api',
	displayName: 'Microsoft Teams OAuth2 API',
	docs: 'microsoft',
	fields: {
		authUrl: field.url('Authorization URL').default(AUTH_URL),
		accessTokenUrl: field.url('Access Token URL').default(TOKEN_URL),
		graphApiBaseUrl: field
			.options('Microsoft Graph API Base URL', {
				'https://graph.microsoft.com': { name: 'Global (https://graph.microsoft.com)' },
				'https://graph.microsoft.us': { name: 'US Government (https://graph.microsoft.us)' },
				'https://dod-graph.microsoft.us': {
					name: 'US Government DOD (https://dod-graph.microsoft.us)',
				},
				'https://microsoftgraph.chinacloudapi.cn': {
					name: 'China (https://microsoftgraph.chinacloudapi.cn)',
				},
			})
			.default('https://graph.microsoft.com')
			.describe('Select the endpoint for your Microsoft cloud environment.'),
	},
	baseUrl: '{graphApiBaseUrl}',
	auth: (a) =>
		a.oauth2.authorizationCode({
			authorizationEndpoint: AUTH_URL,
			tokenEndpoint: TOKEN_URL,
			scope: SCOPES,
			clientAuth: 'client_secret_post',
			pkce: false,
			authorizationQuery: { response_mode: 'query', prompt: 'select_account' },
			editableScopes: true,
		}),
	derive: ({ authUrl, accessTokenUrl }) => ({
		authorizationEndpoint: authUrl,
		tokenEndpoint: accessTokenUrl,
	}),
	notice: {
		text: `
      Microsoft Teams Trigger requires the following permissions:
      <br><code>ChannelMessage.Read.All</code>
      <br><code>Chat.Read.All</code>
      <br><code>Team.ReadBasic.All</code>
      <br><code>Subscription.Read.All</code>
      <br>Configure these permissions in <a href="https://portal.azure.com">Microsoft Entra</a>
    `,
	},
});
