import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const AUTH_TELEMETRY = defineTelemetryEvents({
	USER_ENABLED_MFA: {
		name: 'User enabled MFA',
		description:
			'A user turned on MFA for their own account. The instance reports it after the user confirms a code from their authenticator app. This includes a setup that MFA enforcement asks for.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
	USER_DISABLED_MFA: {
		name: 'User disabled MFA',
		description:
			'A user turned off MFA for their own account, with a code from their authenticator app or a recovery code. The `n8n mfa:disable` CLI command does not report this event.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
});
