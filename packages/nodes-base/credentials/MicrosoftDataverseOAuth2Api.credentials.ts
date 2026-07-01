import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftDataverseOAuth2Api implements ICredentialType {
	name = 'microsoftDataverseOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Microsoft Dataverse OAuth2 API';

	// Anchor is the `## Credentials` heading in README.md — keep that heading stable.
	documentationUrl =
		'https://github.com/microsoft/n8n-nodes-microsoft-dataverse?tab=readme-ov-file#credentials';

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
			hint: 'Must start with https:// and must not include a trailing slash. Example: https://yourorg.crm.dynamics.com',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default:
				'={{ "https://login.microsoftonline.com/" + $self["tenantId"] + "/oauth2/v2.0/authorize" }}',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{ "https://login.microsoftonline.com/" + $self["tenantId"] + "/oauth2/v2.0/token" }}',
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
				'={{ $self["environmentUrl"] + "/.default" + ($self["grantType"] === "clientCredentials" ? "" : " offline_access") }}',
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
	];
}
