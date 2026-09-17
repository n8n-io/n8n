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
	USER_CREATED_CREDENTIALS: {
		name: 'User created credentials',
		description:
			'A credential was created. The server and editor can both emit this event. Deduplicate by credential_id when counting credentials. Description text is never included.',
		properties: z.object({
			credential_id: z.string(),
			credential_type: z.string(),
			...descriptionProperties,
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
	USER_SAVED_CREDENTIALS: {
		name: 'User saved credentials',
		description:
			'The editor saved a credential, or an OAuth connection attempt finished. Description properties describe the saved credential, including when connection testing fails. Description text is never included.',
		properties: z.object({
			credential_id: z.string(),
			credential_type: z.string(),
			...descriptionProperties,
			credential_saved: z
				.boolean()
				.describe(
					'Whether this action created or updated the credential before the event. False when OAuth connects without saving the credential.',
				),
			workflow_id: z.string().nullable().optional(),
			is_complete: z.boolean(),
			is_new: z.boolean(),
			is_valid: z.boolean().optional(),
			uses_external_secrets: z.boolean(),
			node_type: z.string().optional(),
			authError: z.string().optional().describe('Legacy property for the connection error.'),
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
