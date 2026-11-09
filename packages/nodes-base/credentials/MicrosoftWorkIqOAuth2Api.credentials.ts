import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

// Work IQ is its own Entra resource, so its permissions are requested as fully
// qualified scope strings. This is the form the server itself advertises in
// /.well-known/oauth-protected-resource/mcp, rather than the bare `WorkIQ.Read`
// that Microsoft's setup docs use.
const WORK_IQ_RESOURCE_ID = 'fdcc1f02-fc51-4226-8753-f668596af7f7';
const workIqScope = (permission: string) => `${WORK_IQ_RESOURCE_ID}/${permission}`;

const READ_SCOPES = [workIqScope('WorkIQAgent.Ask'), workIqScope('WorkIQ.Read')].join(' ');
const WRITE_SCOPE = workIqScope('WorkIQ.Act');

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
			displayName: 'Allow Write Access',
			name: 'allowWriteAccess',
			type: 'boolean',
			default: false,
			description:
				'Whether to request WorkIQ.Act, letting an agent create, update and delete Microsoft 365 content on behalf of the signed-in user. Leave off for read and ask only.',
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
			// The write scope is gated on an exact `true` so nothing but the toggle
			// itself can widen consent to Microsoft 365 writes.
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: `={{ "${READ_SCOPES}" + ($self["allowWriteAccess"] === true ? " ${WRITE_SCOPE}" : "") + " offline_access" }}`,
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
