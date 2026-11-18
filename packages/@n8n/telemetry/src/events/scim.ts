import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const SCIM_TELEMETRY = defineTelemetryEvents({
	USER_UPDATED_SCIM_SETTINGS: {
		name: 'User updated SCIM settings',
		description:
			'SCIM provisioning turned on or off, or its token was created, rotated or revoked. The backend reports each change once, whether it came from the editor, the REST API, or n8n itself: n8n turns SCIM off when single sign-on turns off, and at startup when single sign-on is off. A request that changes nothing does not report this event.',
		properties: z.object({
			user_id: z
				.string()
				.optional()
				.describe('The user who made the change. Not set when n8n turned SCIM off by itself.'),
			is_active: z.boolean().describe('SCIM provisioning is on after the change.'),
			change: z
				.enum(['enabled', 'disabled', 'token_created', 'token_rotated', 'token_revoked'])
				.describe(
					'What changed. `token_created` means that no token existed before, for example the first token or the first one after a revoke. `token_rotated` means that a new token replaced the current one.',
				),
		}),
	},
	SCIM_REQUEST_REJECTED: {
		name: 'SCIM request rejected',
		description:
			'n8n answered a request of the identity provider with an error status, for example a wrong token, SCIM turned off, or a user that already exists. An identity provider that is set up wrongly retries on each sync, so each main reports a reason and an operation at most once an hour. `count` gives the number of rejections since the last report. The audit log has each rejection.',
		properties: z.object({
			operation: z
				.enum([
					'list_users',
					'get_user',
					'create_user',
					'replace_user',
					'patch_user',
					'delete_user',
					'discovery',
					'other',
				])
				.describe('The SCIM endpoint that the identity provider called.'),
			status: z.number().describe('The HTTP status of the response.'),
			reason: z
				.enum([
					'invalid_token',
					'superseded_token',
					'sso_off',
					'invalid_value',
					'owner_protected',
					'not_found',
					'scim_disabled',
					'forbidden',
					'conflict',
					'invalid_filter',
					'invalid_request',
					'rate_limited',
					'internal_error',
					'other',
				])
				.describe(
					'Why n8n rejected the request. `invalid_token`: no token or a wrong token. `superseded_token`: a token that a rotation replaced. `sso_off`: SAML and OIDC sign-in are off. `owner_protected`: the request tried to delete, deactivate or change the email of the instance owner. `scim_disabled`: SCIM is off. `forbidden`: another policy blocked the request. `conflict`: the user already exists. `rate_limited`: the IP rate limit of the SCIM endpoints. `not_found` with operation `other`: a path or method that n8n does not support, for example `/Groups`.',
				),
			count: z
				.number()
				.describe(
					'Rejections with this reason and operation since the last report, including this one.',
				),
		}),
	},
});
