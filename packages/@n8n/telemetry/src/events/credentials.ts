import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';
import { setupConnectionProperties } from '../setup-properties';

export const CREDENTIALS_TELEMETRY = defineTelemetryEvents({
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
