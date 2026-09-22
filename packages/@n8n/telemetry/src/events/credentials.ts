import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const descriptionProperties = {
	has_description: z.boolean().describe('Whether the saved credential has a nonempty description.'),
	description_length: z
		.number()
		.int()
		.nonnegative()
		.describe('Length of the trimmed, saved description in UTF-16 code units. Zero when absent.'),
};

export const CREDENTIALS_TELEMETRY = defineTelemetryEvents({
	USER_VIEWED_GATEWAY_CREDITS_CREDENTIAL_ERROR_NUDGE: {
		name: 'User viewed Gateway credits credential error nudge',
		description:
			'The credential modal showed a Gateway credits suggestion after a failed credential test for an eligible workflow node.',
		properties: z.object({
			credential_type: z.string(),
			node_type: z.string(),
			workflow_id: z.string().optional(),
		}),
	},
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
			'The user started a connection attempt or selected an existing credential in the setup panel. Includes retries.',
		properties: z.object({
			source: z.literal('instance_ai_setup_panel'),
			workflow_id: z.string(),
			thread_id: z.string(),
			credential_type: z.string(),
			method: z.enum(['oauth', 'api_key', 'gateway', 'advanced', 'existing']),
		}),
	},
	USER_COMPLETED_CREDENTIAL_CONNECTION: {
		name: 'User completed credential connection',
		description:
			'A setup-panel credential was selected or connected and its workflow binding was applied or queued. This does not report workflow validation.',
		properties: z.object({
			source: z.literal('instance_ai_setup_panel'),
			workflow_id: z.string(),
			thread_id: z.string(),
			credential_type: z.string(),
			credential_id: z.string().nullable(),
			method: z.enum(['oauth', 'api_key', 'gateway', 'advanced', 'existing']),
			binding_state: z.enum(['applied', 'noop', 'queued']),
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
