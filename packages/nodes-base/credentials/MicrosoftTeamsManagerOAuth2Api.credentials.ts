import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

const GRAPH = 'https://graph.microsoft.com';

/**
 * `Application.ReadWrite.All` registers the customer's Entra app. It is
 * admin-consent-only, so one tenant admin approves n8n once and every later
 * sign-in is prompt-free.
 *
 * `TeamsAppInstallation.ReadForUser` is a read: the app package is uploaded in
 * the Teams client, so nothing reaches n8n when it happens and Microsoft has
 * to be asked whether it did. n8n installs nothing on anyone's behalf, so no
 * write over someone's installed apps is asked for.
 *
 * **Graph only, deliberately.** Entra accepts several resources in the
 * `/authorize` scope, but a code is redeemed for one resource at a time and n8n
 * sends no scope on the redemption, so a grant spanning Graph and Azure leaves
 * the redemption ambiguous and Entra answers `invalid_request`.
 *
 * Azure access does not need to be named here. It is listed on the app
 * registration and covered by the same admin consent, and a refresh token is
 * bound to the user and the client rather than to a resource — so
 * `TeamsManagerTokenService` mints the Azure token from it, naming that one
 * resource explicitly. The user still signs in once.
 */
const scopes = [
	'openid',
	'profile',
	'offline_access',
	`${GRAPH}/User.Read`,
	`${GRAPH}/Application.ReadWrite.All`,
	`${GRAPH}/TeamsAppInstallation.ReadForUser`,
];

export class MicrosoftTeamsManagerOAuth2Api implements ICredentialType {
	name = 'microsoftTeamsManagerOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Microsoft Teams Manager OAuth2 API';

	icon: Icon = 'file:icons/Microsoft.svg';

	documentationUrl = 'microsoftteams';

	hideDomainRestrictionFields = true;

	hidden = true;

	restrictToSupportedNodes = true as const;

	supportedNodes = [];

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			// `organizations` lets any work or school tenant sign in, which is the
			// whole point: the app is registered once by n8n and used by many. It
			// differs from `common` only in refusing personal accounts, which have
			// no Teams organisation to set anything up in — so Microsoft turns them
			// away at its own sign-in screen rather than letting the setup fail
			// several steps later.
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
		{
			// Same pair the Microsoft node credentials use. `select_account` matters
			// here because the account that provisions is often not the one the
			// browser is already signed in as.
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'response_mode=query&prompt=select_account',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Allowed Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'none',
		},
	];
}
