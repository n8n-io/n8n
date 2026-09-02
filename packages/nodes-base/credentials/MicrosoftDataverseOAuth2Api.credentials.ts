import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftDataverseOAuth2Api implements ICredentialType {
	name = 'microsoftDataverseOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Dataverse OAuth2 API';

	documentationUrl =
		'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/authenticate-oauth';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'options',
			options: [
				{
					name: 'Authorization Code',
					value: 'authorizationCode',
					description: 'Delegated user access via interactive sign-in (recommended)',
				},
				{
					name: 'Client Credentials',
					value: 'clientCredentials',
					description: 'App-only access using a service principal (no signed-in user)',
				},
			],
			default: 'authorizationCode',
			description:
				'OAuth2 flow to use. ' +
				'"Authorization Code" signs in as a real user and uses refresh tokens for long-lived workflows (recommended). ' +
				'"Client Credentials" acts as the application itself — no signed-in user, access token re-acquired silently on expiry.',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			default: 'common',
			required: true,
			description:
				'Microsoft Entra tenant ID (GUID) or verified domain (e.g. contoso.onmicrosoft.com). ' +
				'Find it at portal.azure.com → Microsoft Entra ID → Overview.',
			hint:
				'Authorization Code: "common" works for multi-tenant apps; use a specific GUID or domain for single-tenant. ' +
				'Client Credentials: must be a specific tenant GUID — "common" is not accepted by Entra.',
		},
		{
			displayName: 'Environment URL',
			name: 'environmentUrl',
			type: 'string',
			placeholder: 'https://yourorg.crm.dynamics.com',
			default: '',
			required: true,
			validateType: 'url',
			description:
				'Base URL of your Dataverse environment. ' +
				'Find it in Power Platform admin center under your environment details, ' +
				'or inside the environment at Settings → Session details.',
			hint: 'Must start with https://. A trailing slash is accepted and normalized. Example: https://yourorg.crm.dynamics.com',
		},
		{
			displayName: 'National Cloud',
			name: 'cloud',
			type: 'options',
			default: 'global',
			description:
				'The Microsoft national cloud your Dataverse environment lives in. Controls the Entra login host used for authentication.',
			options: [
				{ name: 'Global (Public Cloud)', value: 'global' },
				{ name: 'US Government (GCC High)', value: 'usgov' },
				{ name: 'US Government (DoD)', value: 'dod' },
				{ name: 'China (21Vianet)', value: 'china' },
			],
		},
		{
			// Login host is derived from the selected national cloud so a sovereign
			// tenant authenticates against the matching login host. Values are a fixed
			// Microsoft host enum (mirrors LOGIN_HOSTS_BY_GRAPH_URL in the Entra
			// credential), keeping the token exchange on trusted hosts.
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default:
				'={{ ($self["cloud"] === "china" ? "https://login.partner.microsoftonline.cn" : ($self["cloud"] === "usgov" || $self["cloud"] === "dod" ? "https://login.microsoftonline.us" : "https://login.microsoftonline.com")) + "/" + $self["tenantId"].trim() + "/oauth2/v2.0/authorize" }}',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{ ($self["cloud"] === "china" ? "https://login.partner.microsoftonline.cn" : ($self["cloud"] === "usgov" || $self["cloud"] === "dod" ? "https://login.microsoftonline.us" : "https://login.microsoftonline.com")) + "/" + $self["tenantId"].trim() + "/oauth2/v2.0/token" }}',
		},
		{
			// Scope resolution rules:
			//  1. `<environmentUrl>/.default` — always included; bundles the Dataverse API permissions
			//     granted to the app in Entra (avoids enumerating individual scopes).
			//  2. `offline_access` — appended for Authorization Code only; tells Entra to return a
			//     refresh token so n8n's oAuth2Api base can silently reissue access tokens on expiry.
			//  3. Omitted for Client Credentials — Entra rejects `offline_access` for app-only flows
			//     with AADSTS70011 ("The provided value for the input parameter 'scope' is not valid").
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{ $self["environmentUrl"].trim().replace(/\\/+$/, "") + "/.default" + ($self["grantType"] === "clientCredentials" ? "" : " offline_access") }}',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			// Inherited from microsoftOAuth2Api but unused: Dataverse doesn't call
			// Microsoft Graph (the data URL comes from environmentUrl) and the login
			// host is driven by the National Cloud selector above. Hide it so the modal
			// doesn't render a control that does nothing.
			displayName: 'Microsoft Graph API Base URL',
			name: 'graphApiBaseUrl',
			type: 'hidden',
			default: 'https://graph.microsoft.com',
		},
	];

	// Runs on save so setup problems surface immediately instead of as a 403 at
	// execution time. Crucially this validates the Client Credentials flow, which
	// has no interactive connect step: Entra issues an app-only token even when the
	// application user hasn't been created in the environment, so a bare token
	// acquisition proves nothing. GET WhoAmI additionally catches a wrong tenant
	// and a mistyped environment URL. The trailing slash is stripped the same way
	// as the scope expression and resolveBaseUrl; the API version is kept in sync
	// with DATAVERSE_API_PATH in the node's constants.ts.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.environmentUrl.trim().replace(/\\/+$/, "") }}',
			url: '/api/data/v9.2/WhoAmI',
			method: 'GET',
			headers: { Accept: 'application/json' },
		},
	};
}
