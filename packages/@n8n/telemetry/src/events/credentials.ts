import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';
import { setupConnectionProperties } from '../setup-properties';

const descriptionProperties = {
	has_description: z.boolean().describe('Whether the saved credential has a nonempty description.'),
	description_length: z
		.number()
		.int()
		.nonnegative()
		.describe('Length of the trimmed, saved description in UTF-16 code units. Zero when absent.'),
};

export const CREDENTIALS_TELEMETRY = defineTelemetryEvents({
	USER_CREATED_CREDENTIALS: {
		name: 'User created credentials',
		description:
			'A credential was created. The server sets source to backend and reports description metadata. Existing editor events omit these properties. Description text is never included.',
		properties: z.object({
			credential_id: z.string(),
			credential_type: z.string(),
			source: z
				.literal('backend')
				.optional()
				.describe('Set by the server. Existing editor events omit it.'),
			public_api: z.boolean().optional().describe('Whether the server used the public API.'),
			has_description: descriptionProperties.has_description.optional(),
			description_length: descriptionProperties.description_length.optional(),
			user_id: z.string().optional(),
			user_role: z.string().optional(),
			project_id: z.string().optional(),
			project_type: z.string().optional(),
			workflow_id: z.string().nullable().optional(),
			uiContext: z.string().optional().describe('Legacy property for the editor entry point.'),
			is_private: z.boolean().optional(),
			uses_external_secrets: z.boolean().optional(),
			jwe_enabled: z.boolean().optional(),
			credential_supports_managed_auth: z.boolean().optional(),
			credential_uses_managed_auth: z.boolean().optional(),
		}),
	},
	USER_UPDATED_CREDENTIALS: {
		name: 'User updated credentials',
		description:
			'The server updated a credential through the internal credential API. Description metadata comes from the saved record. Description text is never included.',
		properties: z.object({
			user_id: z.string(),
			user_role: z.string().optional(),
			credential_id: z.string(),
			credential_type: z.string(),
			source: z.literal('backend'),
			...descriptionProperties,
			is_private: z.boolean(),
			uses_external_secrets: z.boolean(),
			jwe_enabled: z.boolean(),
			credential_supports_managed_auth: z.boolean(),
			credential_uses_managed_auth: z.boolean(),
		}),
	},
	USER_STARTED_CREDENTIAL_CONNECTION: {
		name: 'User started credential connection',
		description:
			'The user started a connection attempt or selected an existing credential during Assistant setup. Includes retries.',
		properties: z.object({
			...setupConnectionProperties,
		}),
	},
	USER_COMPLETED_CREDENTIAL_CONNECTION: {
		name: 'User completed credential connection',
		description:
			'An Assistant setup credential was selected or connected and its workflow binding was applied or queued. This does not report workflow validation.',
		properties: z.object({
			...setupConnectionProperties,
			credential_id: z.string().nullable(),
			binding_state: z.enum(['applied', 'noop', 'queued']),
		}),
	},
	USER_FAILED_CREDENTIAL_CONNECTION: {
		name: 'User failed credential connection',
		description:
			'An active Assistant setup connection attempt failed to connect, validate, or save.',
		properties: z.object({
			...setupConnectionProperties,
			error_type: z.enum(['connection', 'validation', 'save', 'conflict']),
		}),
	},
	USER_CANCELLED_CREDENTIAL_CONNECTION: {
		name: 'User cancelled credential connection',
		description: 'The user explicitly cancelled an active Assistant setup connection attempt.',
		properties: z.object({
			...setupConnectionProperties,
			reason: z.enum(['oauth_closed', 'dialog_closed', 'user_cancelled', 'superseded']),
		}),
	},
	USER_PROBED_CREDENTIAL: {
		name: 'User probed credential',
		description:
			"A stored credential was auth-probed against its own persisted test URL (POST /credentials/:id/probe) — the test path for generic credential types that declare no test, currently Simplified Custom Auth. Fires once per probe, including retries. The outcome is the probe's three-state verdict; joins to 'User created credentials' on credential_id.",
		properties: z.object({
			user_id: z.string(),
			credential_id: z.string(),
			outcome: z
				.enum(['accepted', 'rejected', 'unverified'])
				.describe(
					"'accepted' = the service took the credential (2xx, or a service-declared accepted status code); 'rejected' = explicit 401/403 auth rejection; 'unverified' = anything else (wrong test URL, unreachable service) — proves nothing about the credential",
				),
		}),
	},
});
