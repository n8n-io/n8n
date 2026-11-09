import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Work IQ is its own Entra resource, so its permissions are requested as fully
 * qualified scope strings against the application ID URI, the form Microsoft's
 * Work IQ MCP quickstart gives.
 */
const workIqScope = (permission: string) => `api://workiq.svc.cloud.microsoft/${permission}`;

const ASK = workIqScope('WorkIQAgent.Ask');
const READ = workIqScope('WorkIQ.Read');
/** Microsoft documents Act as already including the read access Read grants. */
const ACT = workIqScope('WorkIQ.Act');

const entraUrl = (endpoint: 'authorize' | 'token') =>
	`={{ "https://login.microsoftonline.com/" + $self["tenantId"].trim() + "/oauth2/v2.0/${endpoint}" }}`;

/**
 * Each level is a separate delegated permission needing its own tenant admin
 * consent, so asking for one the tenant has not granted fails the whole sign-in
 * with AADSTS65001. The default is exactly what the quickstart tells an admin to
 * grant, so a tenant set up by the book connects without further consent.
 */
const SCOPE = `={{ "${ASK}" + ($self["accessLevel"] === "act" ? " ${ACT}" : $self["accessLevel"] === "read" ? " ${READ}" : "") + " offline_access" }}`;

export class MicrosoftWorkIqOAuth2Api implements ICredentialType {
	name = 'microsoftWorkIqOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	icon: Icon = 'file:icons/Microsoft.svg';

	displayName = 'Microsoft Work IQ OAuth2 API';

	documentationUrl = 'microsoftworkiq';

	properties: INodeProperties[] = [
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			default: 'organizations',
			required: true,
			description:
				'Microsoft Entra tenant ID (GUID) or verified domain (e.g. contoso.onmicrosoft.com). Find it at portal.azure.com → Microsoft Entra ID → Overview.',
			hint: 'Leave as "organizations" for a multi-tenant app registration; use a specific GUID or domain for a single-tenant one. "common" is deliberately not the default here, because it admits personal accounts, which cannot have Work IQ.',
		},
		{
			displayName:
				'Asking a Work IQ agent is not a read-only action. Microsoft documents WorkIQAgent.Ask, which every access level requests, as including read and write access to the Microsoft 365 resources an agent can reach.',
			name: 'accessNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Access Level',
			name: 'accessLevel',
			type: 'options',
			default: 'agent',
			description:
				'Which Work IQ permissions to request. Each one needs tenant admin consent on the app registration before anyone can sign in.',
			hint: "Agent only matches the permission Microsoft's Work IQ MCP quickstart tells an admin to grant. The other levels need that extra consent too.",
			options: [
				{
					name: 'Agent Only',
					value: 'agent',
					description:
						'Ask Work IQ agents questions. SharePoint tool paths stay hidden at this level.',
				},
				{
					name: 'Agent Plus Direct Read',
					value: 'read',
					description:
						'Also read Microsoft 365 data directly, which is what exposes the read-only SharePoint tool paths',
				},
				{
					name: 'Agent Plus Direct Changes',
					value: 'act',
					description:
						'Also read and change Microsoft 365 data directly, exposing the SharePoint paths that create, update and delete',
				},
			],
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: entraUrl('authorize'),
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: entraUrl('token'),
		},
		{
			// offline_access is what makes the token refreshable; without it every
			// credential would need an interactive reconnect once the hour is up.
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: SCOPE,
		},
		{
			// Inherited from microsoftOAuth2Api but unused: Work IQ is reached at
			// workiq.svc.cloud.microsoft, not through Graph. Hide it so the modal
			// doesn't render a control that does nothing.
			displayName: 'Microsoft Graph API Base URL',
			name: 'graphApiBaseUrl',
			type: 'hidden',
			default: 'https://graph.microsoft.com',
		},
	];
}
