import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const SSO_TELEMETRY = defineTelemetryEvents({
	USER_UPDATED_SSO_SETTINGS: {
		name: 'User updated single sign on settings',
		description:
			'An admin saved the SAML or OIDC settings or toggled SSO login. The instance reports it from the settings endpoints (REST and public API) with the user and the names of the changed fields; the settings page in the browser reports the same save once more, without them.',
		properties: z.object({
			user_id: z.string().optional().describe('Absent when the browser reports the save'),
			authentication_method: z.enum(['saml', 'oidc']),
			is_active: z
				.boolean()
				.describe('Whether login through this protocol is enabled after the save'),
			fields_changed: z
				.array(z.string())
				.optional()
				.describe(
					'Names of the settings whose stored value changed, never values. Absent when the browser reports the save',
				),
			public_api: z
				.boolean()
				.optional()
				.describe(
					'True when the save came through the public API. Absent when the browser reports the save',
				),
			identity_provider: z
				.enum(['metadata', 'xml'])
				.optional()
				.describe(
					'SAML, browser only: whether the IdP metadata was given as a URL or pasted as XML',
				),
			discovery_endpoint: z
				.string()
				.optional()
				.describe('OIDC, browser only: the discovery URL of the provider'),
			instance_id: z
				.string()
				.optional()
				.describe('Browser only; the instance adds its own id to every event it sends'),
		}),
	},
});
