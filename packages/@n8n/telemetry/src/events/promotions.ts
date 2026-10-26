import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const PROMOTIONS_TELEMETRY = defineTelemetryEvents({
	USER_SWITCHED_TO_ENVIRONMENTS_V2: {
		name: 'User switched to environments v2',
		description:
			'An admin moved the instance from Environments (source control) to Environments v2 (promotions) in the settings. Fires after n8n saves the preference, and only when the version changes.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
	USER_SWITCHED_BACK_TO_ENVIRONMENTS_V1: {
		name: 'User switched back to environments v1',
		description:
			'An admin moved the instance from Environments v2 (promotions) back to Environments (source control) in the settings. Fires after n8n saves the preference, and only when the version changes.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
});
