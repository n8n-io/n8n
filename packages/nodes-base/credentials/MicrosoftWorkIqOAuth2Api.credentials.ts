import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Work IQ is its own Entra resource, so its permissions are requested as fully
 * qualified scope strings. This is the app id form the server advertises in
 * /.well-known/oauth-protected-resource/mcp; Microsoft's permission reference
 * writes the same scopes against the api://workiq.svc.cloud.microsoft/ URI.
 */
const WORK_IQ_RESOURCE_ID = 'fdcc1f02-fc51-4226-8753-f668596af7f7';
const workIqScope = (permission: string) => `${WORK_IQ_RESOURCE_ID}/${permission}`;

/**
 * Asking an agent is not a read-only act. Microsoft documents WorkIQAgent.Ask as
 * including "read and write access to Microsoft 365 resources that are accessible
 * to Work IQ agents", so a Work IQ connection can change mail, calendar and files
 * whatever else is requested. Nothing here may describe itself as read-only.
 */
const BASE_SCOPES = [workIqScope('WorkIQAgent.Ask'), workIqScope('WorkIQ.Read')].join(' ');
const DIRECT_CHANGE_SCOPE = workIqScope('WorkIQ.Act');

const entraUrl = (endpoint: 'authorize' | 'token') =>
	`={{ "https://login.microsoftonline.com/" + $self["tenantId"].trim() + "/oauth2/v2.0/${endpoint}" }}`;

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
				'Connecting grants an agent read and write access to the Microsoft 365 data the signed-in user can reach. Work IQ has no read-only mode: asking an agent a question can also change data.',
			name: 'accessNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Allow Direct Data Changes',
			name: 'allowDirectChanges',
			type: 'boolean',
			default: false,
			description:
				'Whether to also request WorkIQ.Act, which lets Work IQ read and change Microsoft 365 data directly rather than only through an agent. This widens write access, it does not enable it, and it needs its own admin consent.',
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
			default: `={{ "${BASE_SCOPES}" + ($self["allowDirectChanges"] === true ? " ${DIRECT_CHANGE_SCOPE}" : "") + " offline_access" }}`,
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
