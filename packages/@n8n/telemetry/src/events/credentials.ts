import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const CREDENTIALS_TELEMETRY = defineTelemetryEvents({
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
