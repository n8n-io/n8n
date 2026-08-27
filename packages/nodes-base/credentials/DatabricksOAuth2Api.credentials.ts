import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class DatabricksOAuth2Api implements ICredentialType {
	name = 'databricksOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Databricks OAuth2 API';

	documentationUrl = 'https://docs.databricks.com/dev-tools/api/latest/authentication.html';

	icon = 'file:icons/databricks.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'https://adb-xxxxx.xx.azure.databricks.com',
			required: true,
			description: 'Domain of your Databricks workspace, must be <code>https</code>',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'options',
			options: [
				{
					name: 'Client Credentials (Service Principal)',
					value: 'clientCredentials',
				},
				{
					name: 'Authorization Code (User)',
					value: 'authorizationCode',
				},
			],
			// Default stays clientCredentials so already-saved credentials keep working
			default: 'clientCredentials',
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Whether to define custom OAuth scopes instead of the default all-apis',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set. If you change them the node may not function correctly.',
			name: 'customScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
					grantType: ['clientCredentials'],
				},
			},
		},
		{
			// Same name suffix pattern as the scopes fields: the extends-chain merge
			// dedupes by name, so the per-grant notices need distinct names
			displayName:
				'The default scopes needed for the node to work are already set. If you change them the node may not function correctly. <code>offline_access</code> is required to keep the connection alive past one hour and is re-added automatically if removed.',
			name: 'userCustomScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
					grantType: ['authorizationCode'],
				},
			},
		},
		{
			// One field per grant type (a default can't depend on another field, and
			// the extends-chain property merge dedupes by name, so the names must
			// differ): the user grant pre-fills offline_access so it's visible up front
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
					grantType: ['clientCredentials'],
				},
			},
			default: 'all-apis',
			description: 'Space-separated OAuth scopes to request',
		},
		{
			displayName: 'Enabled Scopes',
			name: 'userEnabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
					grantType: ['authorizationCode'],
				},
			},
			default: 'all-apis offline_access',
			description: 'Space-separated OAuth scopes to request',
		},
		{
			// Trailing slash is stripped because users paste the host straight from the
			// browser, and `host/` + `/oidc/...` yields a double slash Databricks 404s on
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '={{$self["host"].replace(/\\/$/, "")}}/oidc/v1/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '={{$self["host"].replace(/\\/$/, "")}}/oidc/v1/token',
			required: true,
		},
		{
			// offline_access is what makes Databricks issue a refresh token, so the user
			// grant survives past the one-hour access token. It is force-appended on that
			// grant even with custom scopes.
			//
			// For this expression to win on reconnect, OauthService.getOAuthCredentials
			// must delete any stale stored scope (e.g. `all-apis` saved before a switch
			// to the user grant). That cleanup only runs while:
			//   1. `scope` stays hidden, and
			//   2. this credential stays OUT of GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE
			//      (packages/cli/src/constants.ts).
			// It never touches the customScopes/enabledScopes/userEnabledScopes fields,
			// so the user's custom scopes survive it.
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{$self["customScopes"] ? ($self["grantType"] === "authorizationCode" ? (($self["userEnabledScopes"].trim() || "all-apis") + ($self["userEnabledScopes"].trim().split(" ").includes("offline_access") ? "" : " offline_access")) : ($self["enabledScopes"].trim() || "all-apis")) : ($self["grantType"] === "authorizationCode" ? "all-apis offline_access" : "all-apis")}}',
		},
		{
			displayName: 'Use PKCE',
			name: 'usePkce',
			type: 'hidden',
			default: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			// Re-declared because the base `oAuth2Api` field is `doNotInherit`, so it
			// never reaches the decrypted credential. Without it the value is always
			// undefined and token refresh is hardcoded to 401 — Databricks returns 403
			// when tokens expire, so the default must be 403.
			displayName: 'Token Expired Status Code',
			name: 'tokenExpiredStatusCode',
			type: 'hidden',
			default: 403,
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host.replace(/\\/$/, "")}}',
			url: '/api/2.0/preview/scim/v2/Me',
			method: 'GET',
		},
	};
}
